import type { StreamEvent } from "@/lib/schema";
import { analyze } from "@/lib/server/analyze";
import { NotConfiguredError } from "@/lib/server/gemini";
import { InputError, MAX_BODY_BYTES, parseForm } from "@/lib/server/input";

// Two model calls plus live data; ask for the most time the plan allows.
export const maxDuration = 60;

const HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const line = (e: StreamEvent) => `${JSON.stringify(e)}\n`;

function errorEvent(e: unknown): StreamEvent {
  if (e instanceof InputError) return { type: "error", code: e.code, message: e.message };
  if (e instanceof NotConfiguredError)
    return { type: "error", code: "not_configured", message: "Live analysis isn’t switched on yet (the Gemini key is missing). Try one of the examples." };
  if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError"))
    return { type: "error", code: "timeout", message: "This took too long. Try again, or send less at once." };
  return { type: "error", code: "model", message: "Something went wrong while analysing. Please try again in a moment." };
}

const STATUS: Record<string, number> = { no_input: 400, bad_file: 415, too_large: 413, not_configured: 503 };

export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES + 200_000) {
    return new Response(line(errorEvent(new InputError("too_large", "That’s too much to send at once. Try fewer or smaller files (4 MB total)."))), { status: 413, headers: HEADERS });
  }

  let input;
  try {
    input = await parseForm(await req.formData());
    if (!process.env.GEMINI_API_KEY) throw new NotConfiguredError();
  } catch (e) {
    const event = errorEvent(e instanceof TypeError ? new InputError("bad_file", "That request couldn’t be read. Please try again.") : e);
    return new Response(line(event), { status: event.type === "error" ? (STATUS[event.code] ?? 400) : 400, headers: HEADERS });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(line(e)));
      try {
        send({ type: "result", result: await analyze(input, send) });
      } catch (e) {
        // Log the kind of failure only; never user content.
        console.error("Analyze failed:", e instanceof Error ? `${e.name}: ${e.message.slice(0, 200)}` : "unknown");
        send(errorEvent(e));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: HEADERS });
}
