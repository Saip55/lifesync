import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, ThinkingLevel, type GenerateContentResponse } from "@google/genai";
import type * as GenAI from "@google/genai";
import { z } from "zod";
import { ActionCardSchema, PlanOutputSchema } from "@/lib/schema";
import { SCENARIOS } from "@/lib/scenarios";

// The SDK is replaced by a fake client; ApiError and enums stay real.
const sdk = vi.hoisted(() => ({ generateContent: vi.fn(), created: [] as string[] }));
vi.mock("@google/genai", async (orig) => ({
  ...(await orig<typeof GenAI>()),
  GoogleGenAI: class {
    models = { generateContent: sdk.generateContent };
    constructor({ apiKey }: { apiKey: string }) {
      sdk.created.push(apiKey);
    }
  },
}));

const { extractJson, generateGrounded, generateJson, groundingSources, jsonSchemaFor, NotConfiguredError } = await import("./gemini");

const reply = (over: Partial<GenerateContentResponse> & { text?: string }) => over as GenerateContentResponse;
const call = { system: "sys", parts: [{ text: "hi" }], timeoutMs: 5_000 };

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "key-1");
  vi.stubEnv("GEMINI_MODEL", "");
  sdk.generateContent.mockReset();
  sdk.created.length = 0;
});
afterEach(() => vi.unstubAllEnvs());

describe("generateJson", () => {
  it("asks for schema-shaped JSON from the configured model with low thinking", async () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-3.5-flash");
    sdk.generateContent.mockResolvedValue(reply({ text: ' {"a":1} ' }));
    await expect(generateJson({ ...call, schema: z.object({ a: z.number() }) })).resolves.toBe('{"a":1}');
    const params = sdk.generateContent.mock.calls[0]?.[0];
    expect(params).toMatchObject({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: "hi" }] }],
      config: { systemInstruction: "sys", responseMimeType: "application/json", thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
    });
    expect(params.config.responseJsonSchema).toMatchObject({ type: "object", required: ["a"] });
    expect(params.config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("refuses to run without a key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(generateJson({ ...call, schema: z.object({}) })).rejects.toBeInstanceOf(NotConfiguredError);
    expect(sdk.generateContent).not.toHaveBeenCalled();
  });

  it("reuses one client per key", async () => {
    sdk.generateContent.mockResolvedValue(reply({ text: "{}" }));
    await generateJson({ ...call, schema: z.object({}) });
    await generateJson({ ...call, schema: z.object({}) });
    vi.stubEnv("GEMINI_API_KEY", "key-2");
    await generateJson({ ...call, schema: z.object({}) });
    expect(sdk.created.filter((k) => k === "key-2")).toHaveLength(1);
    expect(sdk.created).not.toContain("undefined");
  });

  it("retries once when Gemini is overloaded", async () => {
    sdk.generateContent.mockRejectedValueOnce(new ApiError({ message: "high demand", status: 503 })).mockResolvedValueOnce(reply({ text: "{}" }));
    await expect(generateJson({ ...call, schema: z.object({}) })).resolves.toBe("{}");
    expect(sdk.generateContent).toHaveBeenCalledTimes(2);
  });

  it("does not retry a request error, or a call that was cancelled", async () => {
    sdk.generateContent.mockRejectedValue(new ApiError({ message: "bad request", status: 400 }));
    await expect(generateJson({ ...call, schema: z.object({}) })).rejects.toThrow("bad request");
    expect(sdk.generateContent).toHaveBeenCalledTimes(1);

    sdk.generateContent.mockReset().mockRejectedValue(new ApiError({ message: "high demand", status: 503 }));
    const cancelled = AbortSignal.abort();
    await expect(generateJson({ ...call, signal: cancelled, schema: z.object({}) })).rejects.toThrow("high demand");
    expect(sdk.generateContent).toHaveBeenCalledTimes(1);
  });

  it("fails fast on an empty reply instead of trying to repair it", async () => {
    sdk.generateContent.mockResolvedValue(reply({ text: "", promptFeedback: { blockReason: "SAFETY" } } as never));
    await expect(generateJson({ ...call, schema: z.object({}) })).rejects.toThrow(/Empty model reply \(SAFETY\)/);
  });
});

describe("generateGrounded", () => {
  it("turns on Google Search and returns the grounding sources", async () => {
    sdk.generateContent.mockResolvedValue(
      reply({
        text: '{"card":{}}',
        candidates: [{ groundingMetadata: { groundingChunks: [{ web: { uri: "https://pib.gov.in/a", title: "PIB" } }] } }],
      }),
    );
    const out = await generateGrounded(call);
    expect(sdk.generateContent.mock.calls[0]?.[0].config.tools).toEqual([{ googleSearch: {} }]);
    expect(out).toEqual({ text: '{"card":{}}', sources: [{ title: "PIB", url: "https://pib.gov.in/a" }] });
  });
});

describe("groundingSources", () => {
  it("keeps valid links, names untitled ones by host, and drops the rest", () => {
    const res = reply({
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [{ web: { uri: "https://www.who.int/x" } }, { web: { uri: "not a url", title: "Bad" } }, { web: {} }, {}],
          },
        },
      ],
    });
    expect(groundingSources(res)).toEqual([{ title: "www.who.int", url: "https://www.who.int/x" }]);
    expect(groundingSources(reply({}))).toEqual([]);
  });
});

describe("extractJson", () => {
  it("reads JSON inside code fences and surrounding prose", () => {
    expect(extractJson('Here you go:\n```json\n{"a": 1}\n```\nDone.')).toEqual({ a: 1 });
    expect(extractJson('Sure! {"a": {"b": 2}} hope that helps')).toEqual({ a: { b: 2 } });
  });
  it("throws when there is no object", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("jsonSchemaFor", () => {
  it("produces a plain JSON Schema without the $schema key", () => {
    const schema = jsonSchemaFor(PlanOutputSchema);
    expect(schema.$schema).toBeUndefined();
    expect(schema.type).toBe("object");
    expect(schema.required).toEqual(expect.arrayContaining(["card", "news_query", "destination_query"]));
  });
});

describe("demo scenarios", () => {
  it.each(SCENARIOS.map((s) => [s.id, s] as const))("%s sample card matches the schema", (_, s) => {
    expect(ActionCardSchema.safeParse(s.sample.card).success).toBe(true);
  });
});
