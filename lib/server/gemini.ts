import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel, type GenerateContentParameters, type GenerateContentResponse, type Part } from "@google/genai";
import { z } from "zod";
import { env } from "./env";

export { DEFAULT_MODEL } from "./env";

let client: { key: string; ai: GoogleGenAI } | null = null;

export class NotConfiguredError extends Error {
  override name = "NotConfiguredError";
}

function gemini() {
  const { GEMINI_API_KEY: apiKey } = env();
  if (!apiKey) throw new NotConfiguredError("GEMINI_API_KEY is not set");
  if (client?.key !== apiKey) client = { key: apiKey, ai: new GoogleGenAI({ apiKey }) };
  return client.ai;
}

// Gemini's responseJsonSchema takes plain JSON Schema; drop the meta key zod adds.
export function jsonSchemaFor(schema: z.ZodType) {
  const { $schema: _drop, ...rest } = z.toJSONSchema(schema, { io: "output" }) as Record<string, unknown>;
  return rest;
}

type Common = { system: string; parts: Part[]; timeoutMs: number; signal?: AbortSignal };

// The per-call timeout, cut short if the caller goes away (for example the user pressed Start over).
const deadline = (timeoutMs: number, signal?: AbortSignal) =>
  signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);

// Gemini sheds load with 503 "high demand" and the odd transient 500; one short retry usually gets through.
const RETRYABLE = new Set([500, 503]);

async function generate(params: GenerateContentParameters) {
  try {
    return await gemini().models.generateContent(params);
  } catch (e) {
    if (!(e instanceof ApiError && RETRYABLE.has(e.status)) || params.config?.abortSignal?.aborted) throw e;
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    return gemini().models.generateContent(params);
  }
}

// An empty reply (for example a blocked prompt) cannot be repaired, so fail fast instead.
function textOf(res: GenerateContentResponse) {
  const text = res.text?.trim() ?? "";
  if (!text) throw new Error(`Empty model reply (${res.promptFeedback?.blockReason ?? res.candidates?.[0]?.finishReason ?? "no candidates"})`);
  return text;
}

// Structured JSON output, no tools. Used for Plan and for repairs.
export async function generateJson({ system, parts, timeoutMs, signal, schema }: Common & { schema: z.ZodType }) {
  const res = await generate({
    model: env().GEMINI_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchemaFor(schema),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      abortSignal: deadline(timeoutMs, signal),
    },
  });
  return textOf(res);
}

// Google Search grounding on. JSON is requested in the prompt, then validated by the caller.
export async function generateGrounded({ system, parts, timeoutMs, signal }: Common) {
  const res = await generate({
    model: env().GEMINI_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: system,
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      abortSignal: deadline(timeoutMs, signal),
    },
  });
  return { text: textOf(res), sources: groundingSources(res) };
}

export function groundingSources(res: GenerateContentResponse) {
  const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  return chunks.flatMap((c) => {
    const url = c.web?.uri;
    if (!url || !URL.canParse(url)) return [];
    return [{ title: c.web?.title || new URL(url).hostname, url }];
  });
}

// Pulls the first JSON object out of a reply that may be wrapped in prose or code fences.
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)?.[1];
  const body = fenced ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in model reply");
  return JSON.parse(body.slice(start, end + 1));
}
