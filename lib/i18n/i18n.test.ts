import { describe, expect, it } from "vitest";
import { SITE_LANGUAGES } from "@/lib/languages";
import { en, fill, loadDictionary } from ".";

// Every leaf path of a dictionary, with array lengths, e.g. "workspace.stages[4]".
function shape(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) return [`${path}[${value.length}]`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  return [path];
}

function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
  return [];
}

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe.each(SITE_LANGUAGES.filter((l) => l.code !== "en").map((l) => [l.english, l.code] as const))("%s dictionary", (_, code) => {
  it("has exactly the same keys and list lengths as English", async () => {
    expect(shape(await loadDictionary(code))).toEqual(shape(en));
  });

  it("keeps every {placeholder} and leaves no string empty", async () => {
    const theirs = new Map(strings(await loadDictionary(code)));
    for (const [path, source] of strings(en)) {
      const translated = theirs.get(path) ?? "";
      expect(translated.trim(), path).not.toBe("");
      expect(placeholders(translated), path).toEqual(placeholders(source));
    }
  });

  it("is actually translated, not copied from English", async () => {
    const theirs = new Map(strings(await loadDictionary(code)));
    const copied = strings(en).filter(([path, source]) => source.length > 24 && theirs.get(path) === source);
    expect(copied).toEqual([]);
  });

  it("always says LifeSync is not a doctor or emergency service, and gives 112", async () => {
    const t = await loadDictionary(code);
    expect(t.header.disclaimer).toContain("LifeSync");
    expect(t.header.emergency).toContain("112");
    expect(t.card.shareFooter).toContain("112");
  });
});

describe("fill", () => {
  it("fills known placeholders and leaves unknown ones visible", () => {
    expect(fill("Call {phone} for {who}", { phone: 108 })).toBe("Call 108 for {who}");
  });
});

describe("loadDictionary", () => {
  it("returns English without a network request", async () => {
    await expect(loadDictionary("en")).resolves.toBe(en);
  });
});
