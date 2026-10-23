import type { StreamEvent } from "@/lib/schema";

// Posts the form to /api/analyze and reports each newline-delimited JSON event as it arrives.
export async function streamAnalyze(form: FormData, onEvent: (e: StreamEvent) => void, signal: AbortSignal) {
  let res: Response;
  try {
    res = await fetch("/api/analyze", { method: "POST", body: form, signal });
  } catch (e) {
    if (signal.aborted) return;
    throw e;
  }

  // The platform can reject a large body before our route runs, with a non-JSON reply.
  if (res.status === 413 && !res.headers.get("content-type")?.includes("ndjson")) {
    onEvent({ type: "error", code: "too_large", message: "That’s too much to send at once. Try fewer or smaller files (4 MB total)." });
    return;
  }
  if (!res.body) throw new Error("Empty response");

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let ended = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const l of lines) {
      if (!l.trim()) continue;
      const event = JSON.parse(l) as StreamEvent;
      if (event.type !== "stage") ended = true;
      onEvent(event);
    }
  }
  if (!ended) throw new Error("Stream ended without a result");
}
