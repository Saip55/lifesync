import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionCard, StreamEvent } from "@/lib/schema";
import type { AnalyzeInput } from "./input";
import type * as GeminiModule from "./gemini";

const gemini = vi.hoisted(() => ({ generateJson: vi.fn(), generateGrounded: vi.fn() }));
vi.mock("./gemini", async (orig) => ({ ...(await orig<typeof GeminiModule>()), ...gemini }));

const { analyze } = await import("./analyze");

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

beforeEach(() => {
  vi.clearAllMocks();
  // Live signals: weather and news both answer quickly.
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string | URL) =>
      Promise.resolve(
        String(url).includes("open-meteo")
          ? new Response(JSON.stringify({ current: { temperature_2m: 30 }, hourly: { time: [], precipitation_probability: [], precipitation: [] }, daily: { precipitation_sum: [0, 0] } }))
          : new Response("<rss><item><title>RBI denies ATM shutdown - PTI</title><source>PTI</source><link>https://x</link><pubDate>today</pubDate></item></rss>")
      )
    )
  );
  gemini.generateJson.mockResolvedValue(JSON.stringify({ card, news_query: "ATM shutdown India", destination_query: null }));
});

describe("analyze", () => {
  it("runs Plan then Critic, streams all four stages and returns a verified card with sources", async () => {
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
    expect(result.signals.find((s) => s.label === "News")?.value).toContain("RBI denies ATM shutdown");
    // News headlines reach the critic as data.
    expect(JSON.stringify(gemini.generateGrounded.mock.calls[0])).toContain("RBI denies ATM shutdown");
  });

  it("keeps the draft, marks it unverified and caps confidence when the critic fails", async () => {
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

  it("still answers when live signals fail", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    gemini.generateGrounded.mockResolvedValue({ text: JSON.stringify({ card, sources: [] }), sources: [] });
    const result = await analyze(input, () => {});
    expect(result.signals.find((s) => s.label === "Weather")?.value).toMatch(/Not available/);
    expect(result.verified).toBe(true);
  });
});
