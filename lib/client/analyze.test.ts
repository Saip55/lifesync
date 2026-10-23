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

describe("streamAnalyze", () => {
  it("reassembles NDJSON events split across chunks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(chunked('{"type":"stage","sta', 'ge":0}\n{"type":"stage","stage":3}\n{"type":"err', 'or","code":"model","message":"x"}\n'), {
            headers: { "content-type": "application/x-ndjson" },
          })
        )
      )
    );
    const events: StreamEvent[] = [];
    await streamAnalyze(new FormData(), (e) => events.push(e), new AbortController().signal);
    expect(events.map((e) => e.type)).toEqual(["stage", "stage", "error"]);
  });

  it("reports a platform 413 as a friendly too_large error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("Request Entity Too Large", { status: 413 }))));
    const events: StreamEvent[] = [];
    await streamAnalyze(new FormData(), (e) => events.push(e), new AbortController().signal);
    expect(events).toEqual([expect.objectContaining({ type: "error", code: "too_large" })]);
  });

  it("throws if the stream ends without a result", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(chunked('{"type":"stage","stage":0}\n')))));
    await expect(streamAnalyze(new FormData(), () => {}, new AbortController().signal)).rejects.toThrow();
  });
});
