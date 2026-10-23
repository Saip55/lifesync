import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODEL, env } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("env", () => {
  it("treats blank keys as missing and defaults the model", () => {
    vi.stubEnv("GEMINI_API_KEY", "  ");
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GOOGLE_MAPS_KEY", "");
    expect(env()).toEqual({ GEMINI_API_KEY: undefined, GEMINI_MODEL: DEFAULT_MODEL, GOOGLE_MAPS_KEY: undefined });
  });

  it("reads configured values", () => {
    vi.stubEnv("GEMINI_API_KEY", "key-123");
    vi.stubEnv("GEMINI_MODEL", "gemini-3.5-flash");
    vi.stubEnv("GOOGLE_MAPS_KEY", "maps-456");
    expect(env()).toEqual({ GEMINI_API_KEY: "key-123", GEMINI_MODEL: "gemini-3.5-flash", GOOGLE_MAPS_KEY: "maps-456" });
  });

  it("falls back to the default model rather than send a malformed name", () => {
    vi.stubEnv("GEMINI_MODEL", "gemini flash; DROP TABLE");
    expect(env().GEMINI_MODEL).toBe(DEFAULT_MODEL);
  });
});
