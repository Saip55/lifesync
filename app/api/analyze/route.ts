import type { ErrorCode, StreamEvent } from "@/lib/schema";
import { analyze } from "@/lib/server/analyze";
import { env } from "@/lib/server/env";
import { NotConfiguredError } from "@/lib/server/gemini";
import { clientKey, createRateLimiter, isCrossSite } from "@/lib/server/guard";
import { InputError, parseForm, readForm } from "@/lib/server/input";

// Two model calls plus live data; ask for the most time the plan allows.
export const maxDuration = 60;

const HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

// Ten analyses a minute per client is far more than a person needs, and caps what a script can spend.
const rateLimit = createRateLimiter({ limit: 10, windowMs: 60_000 });

const STATUS: Record<ErrorCode, number> = {
  no_input: 400,
  bad_file: 415,
  too_large: 413,
  not_configured: 503,
  timeout: 504,
  model: 502,
  rate_limited: 429,
  forbidden: 403,
};

const line = (e: StreamEvent) => `${JSON.stringify(e)}\n`;

type ErrorEvent = Extract<StreamEvent, { type: "error" }>;

function errorEvent(e: unknown): ErrorEvent {
  if (e instanceof InputError) return { type: "error", code: e.code, message: e.message };
  if (e instanceof NotConfiguredError)
    return { type: "error", code: "not_configured", message: "Live analysis isn’t switched on yet (the Gemini key is missing). Try one of the examples." };
  if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError"))
    return { type: "error", code: "timeout", message: "This took too long. Try again, or send less at once." };
  return { type: "error", code: "model", message: "Something went wrong while analysing. Please try again in a moment." };
}

const fail = (event: ErrorEvent, extra: Record<string, string> = {}) =>
  new Response(line(event), { status: STATUS[event.code], headers: { ...HEADERS, ...extra } });

export async function POST(req: Request) {
  if (isCrossSite(req)) return fail({ type: "error", code: "forbidden", message: "Requests must come from the LifeSync site." });

  const rate = rateLimit(clientKey(req));
  if (!rate.ok) {
    return fail(
      { type: "error", code: "rate_limited", message: "Too many requests at once. Please wait a minute and try again." },
      { "Retry-After": String(rate.retryAfterSeconds) },
    );
  }

  let input;
  try {
    input = await parseForm(await readForm(req));
    if (!env().GEMINI_API_KEY) throw new NotConfiguredError();
  } catch (e) {
    return fail(errorEvent(e));
  }

  // Stops the model calls if the browser goes away (closed tab, or "Start over").
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort(), { once: true });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: StreamEvent) => {
        if (!abort.signal.aborted) controller.enqueue(encoder.encode(line(e)));
      };
      try {
        send({ type: "result", result: await analyze(input, send, abort.signal) });
      } catch (e) {
        // Log the kind of failure only; never user content.
        if (!abort.signal.aborted) console.error("Analyze failed:", e instanceof Error ? `${e.name}: ${e.message.slice(0, 200)}` : "unknown");
        send(errorEvent(e));
      } finally {
        try {
          controller.close();
        } catch {
          // The reader already cancelled the stream.
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, { headers: HEADERS });
}
