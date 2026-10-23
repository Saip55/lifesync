import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel, type GenerateContentParameters, type GenerateContentResponse, type Part } from "@google/genai";
import { z } from "zod";

export const DEFAULT_MODEL = "gemini-3.8-flash";

let client: GoogleGenAI | null = null;

export class NotConfiguredError extends Error {}

function gemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new NotConfiguredError("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

const model = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;

// Gemini's responseJsonSchema takes plain JSON Schema; drop the meta key zod adds.
export function jsonSchemaFor(schema: z.ZodType) {
  const { $schema: _drop, ...rest } = z.toJSONSchema(schema, { io: "output" }) as Record<string, unknown>;
  return rest;
}

type Common = { system: string; parts: Part[]; timeoutMs: number };

// Gemini sheds load with 503 "high demand" during spikes; one short retry usually gets through.
async function generate(params: GenerateContentParameters) {
  try {
    return await gemini().models.generateContent(params);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 503) || params.config?.abortSignal?.aborted) throw e;
    await new Promise((r) => setTimeout(r, 800));
    return gemini().models.generateContent(params);
  }
}

// Structured JSON output, no tools. Used for Plan and for repairs.
export async function generateJson({ system, parts, timeoutMs, schema }: Common & { schema: z.ZodType }) {
  const res = await generate({
    model: model(),
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchemaFor(schema),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      abortSignal: AbortSignal.timeout(timeoutMs),
    },
  });
  return res.text ?? "";
}

// Google Search grounding on. JSON is requested in the prompt, then validated by the caller.
export async function generateGrounded({ system, parts, timeoutMs }: Common) {
  const res = await generate({
    model: model(),
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: system,
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      abortSignal: AbortSignal.timeout(timeoutMs),
    },
  });
  return { text: res.text ?? "", sources: groundingSources(res) };
}

export function groundingSources(res: GenerateContentResponse) {
  const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  return chunks.flatMap((c) => (c.web?.uri ? [{ title: c.web.title || new URL(c.web.uri).hostname, url: c.web.uri }] : []));
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
