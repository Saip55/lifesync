import "server-only";
import type { Part } from "@google/genai";
import { z } from "zod";
import { CriticOutputSchema, PlanOutputSchema, type ActionCard, type AnalyzeResult, type Signal, type Source, type StreamEvent } from "@/lib/schema";
import { LANGUAGES } from "@/lib/languages";
import { env } from "./env";
import { extractJson, generateGrounded, generateJson } from "./gemini";
import { CRITIC_SYSTEM, criticUserText, documentText, PLAN_SYSTEM, planUserText, REPAIR_SYSTEM, repairUserText } from "./prompts";
import { enforceSafety } from "./safety";
import type { AnalyzeInput } from "./input";
import { fetchWeather } from "./signals/weather";
import { fetchNews, type Headline } from "./signals/news";
import { describeTraffic, fetchTraffic } from "./signals/traffic";

// Exactly two Gemini calls per request (Plan, then Critic), plus one repair call only if a reply fails validation.
const BUDGET_MS = 55_000;
const SIGNAL_TIMEOUT_MS = 4_500;
// Plan never waits longer than this for weather; the critic still gets it if it arrives later.
const PLAN_WEATHER_WAIT_MS = 2_000;

type Outcome<T> = { ok: true; value: T; ms: number } | { ok: false; reason: string; ms: number };

// A failed live signal is recorded, never fatal.
async function attempt<T>(run: (signal: AbortSignal) => Promise<T>, parent: AbortSignal, timeoutMs = SIGNAL_TIMEOUT_MS): Promise<Outcome<T>> {
  const t0 = Date.now();
  try {
    return { ok: true, value: await run(AbortSignal.any([parent, AbortSignal.timeout(timeoutMs)])), ms: Date.now() - t0 };
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return { ok: false, reason: timedOut ? "timed out" : "unavailable", ms: Date.now() - t0 };
  }
}

// Resolves with the promise's value, or null if it takes longer than `ms`.
function within<T>(p: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(resolve, ms, null);
  });
  return Promise.race([p, late]).finally(() => clearTimeout(timer));
}

function parse<T>(raw: string, schema: z.ZodType<T>): { ok: true; value: T } | { ok: false; problem: string } {
  try {
    const result = schema.safeParse(extractJson(raw));
    return result.success ? { ok: true, value: result.data } : { ok: false, problem: z.prettifyError(result.error).slice(0, 1500) };
  } catch (e) {
    return { ok: false, problem: e instanceof Error ? e.message : "invalid JSON" };
  }
}

// Validate with zod; on failure, one repair call with the schema enforced, then give up.
async function parseOrRepair<T>(raw: string, schema: z.ZodType<T>, timeoutMs: number, signal: AbortSignal): Promise<T> {
  const first = parse(raw, schema);
  if (first.ok) return first.value;
  const fixed = await generateJson({ system: REPAIR_SYSTEM, parts: [{ text: repairUserText(raw, first.problem) }], schema, timeoutMs, signal });
  const second = parse(fixed, schema);
  if (second.ok) return second.value;
  throw new Error("Model reply did not match the action card schema");
}

function inputParts(input: AnalyzeInput, weather: string | null): Part[] {
  const parts: Part[] = [
    {
      text: planUserText({
        text: input.text,
        replyLanguage: input.replyLanguage,
        weather,
        fileNames: [...input.files, ...input.docs].map((f) => f.name),
      }),
    },
  ];
  for (const d of input.docs) parts.push({ text: documentText(d.name, d.text) });
  for (const f of input.files) parts.push({ inlineData: { mimeType: f.mimeType, data: f.data } });
  if (input.audio) {
    parts.push({ text: "Voice note from the user (their own words):" });
    parts.push({ inlineData: { mimeType: input.audio.mimeType, data: input.audio.data } });
  }
  return parts;
}

// Only absolute http(s) links, each once, at most eight.
export function dedupeSources(list: Source[]): Source[] {
  const seen = new Set<string>();
  return list
    .filter((s) => {
      if (!URL.canParse(s.url)) return false;
      const { protocol, href } = new URL(s.url);
      if ((protocol !== "https:" && protocol !== "http:") || seen.has(href)) return false;
      seen.add(href);
      return true;
    })
    .map((s) => ({ title: s.title.trim().slice(0, 200) || new URL(s.url).hostname, url: new URL(s.url).href }))
    .slice(0, 8);
}

const headlinesText = (h: Headline[]) => h.map((n) => `- ${n.title} (${n.source}, ${n.date})`).join("\n");

function describeInputs(input: AnalyzeInput) {
  const photos = input.files.filter((f) => f.mimeType.startsWith("image/")).length;
  const pdfs = input.files.length - photos + input.docs.length;
  return [
    input.text && "Text",
    photos && `${photos} photo${photos > 1 ? "s" : ""}`,
    pdfs && `${pdfs} document${pdfs > 1 ? "s" : ""}`,
    input.audio && "Voice note",
    input.lat !== null && "Location",
  ]
    .filter(Boolean)
    .join(", ");
}

export async function analyze(input: AnalyzeInput, emit: (e: StreamEvent) => void, signal: AbortSignal = new AbortController().signal): Promise<AnalyzeResult> {
  const deadline = Date.now() + BUDGET_MS;
  const left = (cap: number) => Math.max(3_000, Math.min(cap, deadline - Date.now() - 2_000));

  emit({ type: "stage", stage: 0 });
  emit({ type: "stage", stage: 1 });
  const weatherRun = attempt((s) => fetchWeather(input.lat, input.lon, s), signal);
  const earlyWeather = await within(weatherRun, PLAN_WEATHER_WAIT_MS);
  const planWeather = earlyWeather?.ok ? earlyWeather.value.summary : null;

  // Call 1: Plan. Multimodal input + weather in, draft card out (also detects language and transcribes audio).
  emit({ type: "stage", stage: 2 });
  const t0 = Date.now();
  const planRaw = await generateJson({ system: PLAN_SYSTEM, parts: inputParts(input, planWeather), schema: PlanOutputSchema, timeoutMs: left(25_000), signal });
  const plan = await parseOrRepair(planRaw, PlanOutputSchema, left(10_000), signal);
  const planMs = Date.now() - t0;

  const destination = plan.destination_query?.trim();
  const [weather, news, traffic] = await Promise.all([
    weatherRun,
    attempt((s) => fetchNews(plan.news_query, s), signal),
    input.lat !== null && input.lon !== null && destination && env().GOOGLE_MAPS_KEY
      ? attempt((s) => fetchTraffic(input.lat as number, input.lon as number, destination, s), signal, 6_000)
      : Promise.resolve(null),
  ]);
  const weatherText = weather.ok ? weather.value.summary : null;
  const trafficValue = traffic?.ok ? traffic.value : null;

  // Call 2: Critic with Google Search grounding. If it fails, keep the draft and say so.
  emit({ type: "stage", stage: 3 });
  const t1 = Date.now();
  let card: ActionCard = plan.card;
  let verified = false;
  let sources: Source[] = [];
  try {
    const critic = await generateGrounded({
      system: CRITIC_SYSTEM,
      parts: [
        {
          text: criticUserText({
            draft: plan.card,
            weather: weatherText,
            news: news.ok && news.value.length ? headlinesText(news.value) : null,
            traffic: trafficValue ? describeTraffic(trafficValue) : null,
          }),
        },
      ],
      timeoutMs: left(28_000),
      signal,
    });
    const checked = await parseOrRepair(critic.text, CriticOutputSchema, left(10_000), signal);
    card = checked.card;
    sources = dedupeSources([...critic.sources, ...checked.sources]);
    verified = true;
  } catch (e) {
    if (signal.aborted) throw e;
    console.error("Critic pass failed:", e instanceof Error ? e.name : "unknown");
    card = { ...card, critic_notes: [...card.critic_notes, "Fact-check did not complete, so nothing on this card has been verified."] };
  }
  const criticMs = Date.now() - t1;
  const safe = enforceSafety(card, { verified });

  const signals: Signal[] = [
    { key: "weather", value: weather.ok ? weather.value.summary : `Not available (${weather.reason})` },
    {
      key: "news",
      value: news.ok
        ? news.value.length
          ? news.value
              .slice(0, 3)
              .map((n) => `${n.title} (${n.source})`)
              .join(" · ")
          : "No recent reports found"
        : `Not available (${news.reason})`,
    },
    ...(traffic
      ? [
          {
            key: "traffic" as const,
            value: trafficValue ? describeTraffic(trafficValue) : traffic.ok ? "No nearby place found" : `Not available (${traffic.reason})`,
          },
        ]
      : []),
    { key: "language", value: LANGUAGES.find((l) => l.code === safe.language_code.split("-")[0])?.english ?? safe.language_code },
    { key: "inputs", value: describeInputs(input) },
    { key: "timing", value: `Plan ${(planMs / 1000).toFixed(1)} s, fact-check ${(criticMs / 1000).toFixed(1)} s` },
  ];

  return { card: safe, verified, sources, signals };
}
