import { describe, expect, it } from "vitest";
import { getLanguage, isLanguageCode, isSiteLanguage, LANGUAGES, SITE_LANGUAGES } from "./languages";

describe("languages", () => {
  it("covers the twelve major Indian languages, with Urdu right-to-left", () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(["en", "hi", "bn", "mr", "te", "ta", "gu", "ur", "kn", "or", "ml", "pa"]);
    expect(LANGUAGES.filter((l) => l.dir === "rtl").map((l) => l.code)).toEqual(["ur"]);
  });

  it("translates the site into six of them", () => {
    expect(SITE_LANGUAGES.map((l) => l.code)).toEqual(["en", "hi", "bn", "mr", "te", "ta"]);
    expect(isSiteLanguage("ta")).toBe(true);
    expect(isSiteLanguage("ur")).toBe(false);
    expect(isSiteLanguage(null)).toBe(false);
  });

  it("recognises codes and falls back to English", () => {
    expect(isLanguageCode("pa")).toBe(true);
    expect(isLanguageCode("fr")).toBe(false);
    expect(getLanguage("ml").native).toBe("മലയാളം");
    expect(getLanguage("xx").code).toBe("en");
  });
});
