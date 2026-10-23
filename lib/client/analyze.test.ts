import { afterEach, describe, expect, it, vi } from "vitest";
import type { StreamEvent } from "@/lib/schema";
import { streamAnalyze } from "./analyze";

// A body that arrives in awkward chunks, splitting JSON lines mid-way.
const chunked = (...parts: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      const enc = new TextEncoder();
      parts.forEach((p) => c.enqueue(enc.encode(p)));
      c.close();
    },
  });

afterEach(() => vi.unstubAllGlobals());

const run = async () => {
  const events: StreamEvent[] = [];
  await streamAnalyze(new FormData(), (e) => events.push(e), new AbortController().signal);
  return events;
};

describe("streamAnalyze", () => {
  it("reassembles NDJSON events split across chunks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(chunked('{"type":"stage","sta', 'ge":0}\n\n{"type":"stage","stage":3}\n{"type":"err', 'or","code":"model","message":"x"}\n'), {
            headers: { "content-type": "application/x-ndjson" },
          })
        )
      )
    );
    expect((await run()).map((e) => e.type)).toEqual(["stage", "stage", "error"]);
  });

  it("posts the form to the analyze endpoint with the caller's abort signal", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(chunked('{"type":"error","code":"model","message":"x"}\n'))));
    vi.stubGlobal("fetch", fetchMock);
    const form = new FormData();
    const controller = new AbortController();
    await streamAnalyze(form, () => {}, controller.signal);
    expect(fetchMock).toHaveBeenCalledWith("/api/analyze", { method: "POST", body: form, signal: controller.signal });
  });

  it("reports a platform 413 as a friendly too_large error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("Request Entity Too Large", { status: 413 }))));
    expect(await run()).toEqual([expect.objectContaining({ type: "error", code: "too_large" })]);
  });

  it("stays quiet when the user cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new DOMException("aborted", "AbortError"))));
    const onEvent = vi.fn();
    await expect(streamAnalyze(new FormData(), onEvent, controller.signal)).resolves.toBeUndefined();
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("surfaces a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(run()).rejects.toThrow("Failed to fetch");
  });

  it("throws if there is no body, or the stream ends without a result", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null))));
    await expect(run()).rejects.toThrow("Empty response");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(chunked('{"type":"stage","stage":0}\n')))));
    await expect(run()).rejects.toThrow("without a result");
  });
});
