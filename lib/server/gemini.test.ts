import { describe, expect, it } from "vitest";
import { ActionCardSchema, PlanOutputSchema } from "@/lib/schema";
import { SCENARIOS } from "@/lib/scenarios";
import { extractJson, jsonSchemaFor } from "./gemini";

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
