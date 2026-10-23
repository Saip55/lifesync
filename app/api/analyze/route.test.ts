import { afterEach, describe, expect, it, vi } from "vitest";
import { SCENARIOS } from "@/lib/scenarios";

const analyzeMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/analyze", () => ({ analyze: analyzeMock }));

const { POST } = await import("./route");

const post = (form: FormData) => POST(new Request("http://localhost/api/analyze", { method: "POST", body: form }));
const lines = async (res: Response) => (await res.text()).trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);

afterEach(() => {
  vi.unstubAllEnvs();
  analyzeMock.mockReset();
});

describe("POST /api/analyze", () => {
  it("rejects an empty request with a friendly message", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    const res = await post(new FormData());
    expect(res.status).toBe(400);
    expect(await lines(res)).toEqual([{ type: "error", code: "no_input", message: expect.stringContaining("Add a few words") }]);
  });

  it("rejects unsupported file types", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    const form = new FormData();
    form.append("files", new File(["x"], "virus.exe", { type: "application/x-msdownload" }));
    const res = await post(form);
    expect(res.status).toBe(415);
  });

  it("says when the Gemini key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const form = new FormData();
    form.set("text", "hello");
    const res = await post(form);
    expect(res.status).toBe(503);
    expect((await lines(res))[0]).toMatchObject({ code: "not_configured" });
  });

  it("streams stage events then the result as NDJSON", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    const sample = SCENARIOS[0]?.sample;
    analyzeMock.mockImplementation(async (_input, emit: (e: unknown) => void) => {
      emit({ type: "stage", stage: 0 });
      emit({ type: "stage", stage: 3 });
      return sample;
    });
    const form = new FormData();
    form.set("text", "chest pain");
    form.set("lat", "18.52");
    form.set("lon", "73.85");
    const res = await post(form);
    expect(res.headers.get("content-type")).toContain("ndjson");
    const events = await lines(res);
    expect(events.map((e) => e.type)).toEqual(["stage", "stage", "result"]);
    expect(analyzeMock.mock.calls[0]?.[0]).toMatchObject({ text: "chest pain", lat: 18.52, lon: 73.85 });
  });

  it("turns a model failure into a plain error, without a stack trace", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    analyzeMock.mockRejectedValue(new Error("500 INTERNAL at node_modules/..."));
    const form = new FormData();
    form.set("text", "help");
    const events = await lines(await post(form));
    expect(events).toEqual([{ type: "error", code: "model", message: expect.not.stringContaining("node_modules") }]);
  });
});
