import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionCard, StreamEvent } from "@/lib/schema";
import type { AnalyzeInput } from "./input";
import type * as GeminiModule from "./gemini";

const gemini = vi.hoisted(() => ({ generateJson: vi.fn(), generateGrounded: vi.fn() }));
vi.mock("./gemini", async (orig) => ({ ...(await orig<typeof GeminiModule>()), ...gemini }));

const { analyze, dedupeSources } = await import("./analyze");

const card: ActionCard = {
  situation: "ATM shutdown rumour",
  language_code: "en",
  category: "misinformation",
  risk_level: "info",
  risk_reason: "A viral claim.",
  verified_facts: [{ claim: "All ATMs will close for 7 days", source: "Forward", status: "unverified" }],
  actions: [],
  contacts: [],
  health_card: null,
  rumor_verdict: { verdict: "unverifiable", correction: "Checking." },
  confidence: 70,
  couldnt_verify: [],
  critic_notes: [],
  spoken_summary: "Checking this claim.",
};

const input: AnalyzeInput = { text: "All ATMs will shut for 7 days!", audio: null, files: [], docs: [], lat: null, lon: null, replyLanguage: null };

const WEATHER = { current: { temperature_2m: 30 }, hourly: { time: [], precipitation_probability: [], precipitation: [] }, daily: { precipitation_sum: [0, 0] } };
const NEWS = "<rss><item><title>RBI denies ATM shutdown - PTI</title><source>PTI</source><link>https://x</link><pubDate>today</pubDate></item></rss>";

// Live signals: weather and news both answer quickly.
const liveData = (url: string | URL) => Promise.resolve(String(url).includes("open-meteo") ? new Response(JSON.stringify(WEATHER)) : new Response(NEWS));
const fetchMock = vi.fn(liveData);

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockImplementation(liveData);
  vi.stubGlobal("fetch", fetchMock);
  gemini.generateJson.mockResolvedValue(JSON.stringify({ card, news_query: "ATM shutdown India", destination_query: null }));
  gemini.generateGrounded.mockResolvedValue({ text: JSON.stringify({ card, sources: [] }), sources: [] });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("analyze", () => {
  it("runs Plan then Critic, streams all four stages and returns a verified card with sources", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const corrected = { ...card, rumor_verdict: { verdict: "false", correction: "RBI says ATMs stay open." }, confidence: 88 };
    gemini.generateGrounded.mockResolvedValue({
      text: "```json\n" + JSON.stringify({ card: corrected, sources: [{ title: "RBI", url: "https://rbi.org.in/x" }] }) + "\n```",
      sources: [{ title: "pib.gov.in", url: "https://pib.gov.in/y" }],
    });
    const events: StreamEvent[] = [];
    const result = await analyze(input, (e) => events.push(e));

    expect(events.map((e) => e.type === "stage" && e.stage)).toEqual([0, 1, 2, 3]);
    expect(gemini.generateJson).toHaveBeenCalledTimes(1);
    expect(gemini.generateGrounded).toHaveBeenCalledTimes(1);
    expect(result.verified).toBe(true);
    expect(result.card.rumor_verdict?.verdict).toBe("false");
    expect(result.sources.map((s) => s.url)).toEqual(["https://pib.gov.in/y", "https://rbi.org.in/x"]);
    expect(result.signals.map((s) => s.key)).toEqual(["weather", "news", "language", "inputs", "timing"]);
    expect(result.signals.find((s) => s.key === "news")?.value).toContain("RBI denies ATM shutdown");
    expect(result.signals.find((s) => s.key === "inputs")?.value).toBe("Text");
    // News headlines reach the critic as fenced data.
    expect(JSON.stringify(gemini.generateGrounded.mock.calls[0])).toContain("<data>- RBI denies ATM shutdown");
  });

  it("keeps the draft, marks it unverified and caps confidence when the critic fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    gemini.generateGrounded.mockRejectedValue(Object.assign(new Error("timeout"), { name: "TimeoutError" }));
    const result = await analyze(input, () => {});
    expect(result.verified).toBe(false);
    expect(result.card.confidence).toBeLessThanOrEqual(40);
    expect(result.card.critic_notes.join(" ")).toMatch(/did not complete/);
  });

  it("repairs a malformed critic reply once", async () => {
    gemini.generateGrounded.mockResolvedValue({ text: '{"card": {"situation": "half a card"}}', sources: [] });
    gemini.generateJson
      .mockResolvedValueOnce(JSON.stringify({ card, news_query: "ATM", destination_query: null }))
      .mockResolvedValueOnce(JSON.stringify({ card: { ...card, confidence: 81 }, sources: [] }));
    const result = await analyze(input, () => {});
    expect(gemini.generateJson).toHaveBeenCalledTimes(2);
    expect(result.verified).toBe(true);
    expect(result.card.confidence).toBe(81);
  });

  it("gives up with an error when the plan cannot be repaired", async () => {
    gemini.generateJson.mockResolvedValue("not json at all");
    await expect(analyze(input, () => {})).rejects.toThrow(/did not match/);
    expect(gemini.generateGrounded).not.toHaveBeenCalled();
  });

  it("still answers when live signals fail", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    const result = await analyze(input, () => {});
    expect(result.signals.find((s) => s.key === "weather")?.value).toBe("Not available (unavailable)");
    expect(result.signals.find((s) => s.key === "news")?.value).toBe("Not available (unavailable)");
    expect(result.verified).toBe(true);
  });

  it("stops, instead of reporting an unverified card, when the user cancels", async () => {
    const controller = new AbortController();
    gemini.generateGrounded.mockImplementation(() => {
      controller.abort();
      return Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    });
    await expect(analyze(input, () => {}, controller.signal)).rejects.toThrow("aborted");
    expect(gemini.generateJson.mock.calls[0]?.[0].signal).toBe(controller.signal);
  });

  it("does not hold the plan for slow weather, but still gives it to the fact-checker", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let release: (r: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string | URL) =>
        String(url).includes("open-meteo") ? new Promise<Response>((r) => (release = r)) : Promise.resolve(new Response(NEWS))
      )
    );
    const running = analyze({ ...input, lat: 18.52, lon: 73.85 }, () => {});
    await vi.advanceTimersByTimeAsync(2_000);
    expect(gemini.generateJson).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(gemini.generateJson.mock.calls[0])).toContain("Live weather: not available.");

    release(new Response(JSON.stringify({ ...WEATHER, current: { temperature_2m: 24 } })));
    const result = await running;
    expect(JSON.stringify(gemini.generateGrounded.mock.calls[0])).toContain("Now 24°C");
    expect(result.signals.find((s) => s.key === "inputs")?.value).toBe("Text, Location");
  });

  it("looks up traffic only with a Maps key, a location and a destination", async () => {
    vi.stubEnv("GOOGLE_MAPS_KEY", "maps-key");
    gemini.generateJson.mockResolvedValue(JSON.stringify({ card, news_query: "chest pain", destination_query: "hospital" }));
    fetchMock.mockImplementation((url: string | URL) => {
      const u = String(url);
      if (u.includes("places.googleapis")) {
        return Promise.resolve(Response.json({ places: [{ displayName: { text: "City Hospital" }, formattedAddress: "MG Road", location: { latitude: 1, longitude: 2 } }] }));
      }
      if (u.includes("routes.googleapis")) return Promise.resolve(Response.json({ routes: [{ duration: "720s", staticDuration: "540s", distanceMeters: 4200 }] }));
      return liveData(url);
    });

    const withLocation = await analyze({ ...input, lat: 18.5, lon: 73.8 }, () => {});
    expect(withLocation.signals.find((s) => s.key === "traffic")?.value).toBe("City Hospital, MG Road: 4.2 km, about 12 min with current traffic (9 min without).");
    expect(JSON.stringify(gemini.generateGrounded.mock.calls[0])).toContain("City Hospital");

    const withoutLocation = await analyze(input, () => {});
    expect(withoutLocation.signals.some((s) => s.key === "traffic")).toBe(false);
  });

  it("describes every kind of input it received", async () => {
    const result = await analyze(
      {
        ...input,
        audio: { name: "voice note", mimeType: "audio/webm", data: "" },
        files: [
          { name: "a.jpg", mimeType: "image/jpeg", data: "" },
          { name: "b.png", mimeType: "image/png", data: "" },
          { name: "c.pdf", mimeType: "application/pdf", data: "" },
        ],
        docs: [{ name: "d.txt", text: "notes" }],
      },
      () => {}
    );
    expect(result.signals.find((s) => s.key === "inputs")?.value).toBe("Text, 2 photos, 2 documents, Voice note");
    const parts = gemini.generateJson.mock.calls[0]?.[0].parts as unknown[];
    expect(parts).toHaveLength(1 + 1 + 3 + 2); // prompt, document, three files, voice label + audio
  });
});

describe("dedupeSources", () => {
  it("keeps only unique http(s) links, at most eight", () => {
    const list = [
      { title: "A", url: "https://a.example/x" },
      { title: "A again", url: "https://a.example/x" },
      { title: "Bad", url: ["javascript", "alert(1)"].join(":") },
      { title: "Data", url: "data:text/html,hi" },
      { title: "Relative", url: "/x" },
      { title: "  ", url: "http://b.example" },
      ...Array.from({ length: 10 }, (_, i) => ({ title: `S${i}`, url: `https://s${i}.example` })),
    ];
    const out = dedupeSources(list);
    expect(out).toHaveLength(8);
    expect(out.slice(0, 2)).toEqual([
      { title: "A", url: "https://a.example/x" },
      { title: "b.example", url: "http://b.example/" },
    ]);
    expect(out.every((s) => /^https?:\/\//.test(s.url))).toBe(true);
  });
});
