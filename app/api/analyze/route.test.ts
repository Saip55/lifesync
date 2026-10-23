import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCENARIOS } from "@/lib/scenarios";

const analyzeMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/analyze", () => ({ analyze: analyzeMock }));

let ip = 0;
// Each test is a fresh client, so the per-client rate limit does not leak between tests.
const post = (form: FormData | BodyInit, headers: Record<string, string> = {}, init: RequestInit = {}) =>
  POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      body: form,
      headers: { "x-forwarded-for": `203.0.113.${ip}`, ...headers },
      ...init,
    }),
  );
const lines = async (res: Response) =>
  (await res.text())
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as Record<string, unknown>);
const textForm = (text: string) => {
  const f = new FormData();
  f.set("text", text);
  return f;
};

const { POST } = await import("./route");

beforeEach(() => {
  ip += 1;
  vi.stubEnv("GEMINI_API_KEY", "test");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  analyzeMock.mockReset();
});

describe("POST /api/analyze", () => {
  it("rejects an empty request with a friendly message", async () => {
    const res = await post(new FormData());
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await lines(res)).toEqual([{ type: "error", code: "no_input", message: expect.stringContaining("Add a few words") }]);
  });

  it("rejects unsupported file types", async () => {
    const form = new FormData();
    form.append("files", new File(["MZ\x90\x00"], "virus.exe", { type: "application/x-msdownload" }));
    const res = await post(form);
    expect(res.status).toBe(415);
    expect((await lines(res))[0]).toMatchObject({ code: "bad_file" });
  });

  it("rejects a body that is not a form", async () => {
    const res = await post(JSON.stringify({ text: "hi" }), { "content-type": "application/json" });
    expect(res.status).toBe(415);
  });

  it("says when the Gemini key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await post(textForm("hello"));
    expect(res.status).toBe(503);
    expect((await lines(res))[0]).toMatchObject({ code: "not_configured" });
    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it("refuses requests made by another website", async () => {
    const res = await post(textForm("hello"), { "sec-fetch-site": "cross-site", origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect((await lines(res))[0]).toMatchObject({ code: "forbidden" });
    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it("rate-limits one client and says when to come back", async () => {
    analyzeMock.mockResolvedValue(SCENARIOS[0]?.sample);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await post(textForm("hello"))).status);
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);

    const limited = await post(textForm("hello"));
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await lines(limited))[0]).toMatchObject({ code: "rate_limited" });
  });

  it("streams stage events then the result as NDJSON", async () => {
    const sample = SCENARIOS[0]?.sample;
    analyzeMock.mockImplementation(async (_input, emit: (e: unknown) => void) => {
      emit({ type: "stage", stage: 0 });
      emit({ type: "stage", stage: 3 });
      return sample;
    });
    const form = textForm("chest pain");
    form.set("lat", "18.52");
    form.set("lon", "73.85");
    const res = await post(form);
    expect(res.headers.get("content-type")).toContain("ndjson");
    const events = await lines(res);
    expect(events.map((e) => e.type)).toEqual(["stage", "stage", "result"]);
    expect(analyzeMock.mock.calls[0]?.[0]).toMatchObject({ text: "chest pain", lat: 18.52, lon: 73.85 });
  });

  it("turns a model failure into a plain error, without a stack trace or user content in the log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    analyzeMock.mockRejectedValue(new Error("500 INTERNAL at node_modules/..."));
    const events = await lines(await post(textForm("my father's prescription")));
    expect(events).toEqual([{ type: "error", code: "model", message: expect.not.stringContaining("node_modules") }]);
    expect(JSON.stringify(log.mock.calls)).not.toContain("prescription");
  });

  it("reports a timeout as a timeout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    analyzeMock.mockRejectedValue(Object.assign(new Error("deadline"), { name: "TimeoutError" }));
    expect((await lines(await post(textForm("help"))))[0]).toMatchObject({ code: "timeout" });
  });

  it("cancels the analysis when the browser goes away", async () => {
    const browser = new AbortController();
    let seen: AbortSignal | undefined;
    analyzeMock.mockImplementation(
      (_input, _emit, signal: AbortSignal) =>
        new Promise((_, reject) => {
          seen = signal;
          signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        }),
    );
    const res = await post(textForm("help"), {}, { signal: browser.signal });
    const reading = res.text();
    await vi.waitFor(() => expect(seen).toBeDefined());
    browser.abort();
    await vi.waitFor(() => expect(seen?.aborted).toBe(true));
    await reading.catch(() => {});
  });
});
