import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n";
import { SCENARIOS } from "@/lib/scenarios";
import { planText } from "./summary";

const sample = (id: string) => {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(id);
  return s.sample;
};

describe("planText", () => {
  it("lists the risk, numbered steps with numbers to call, contacts and gaps", () => {
    const text = planText(sample("medical"), en.card);
    const lines = text.split("\n");
    expect(lines[0]).toMatch(/^High risk: /);
    expect(text).toContain("Do this now\n1. Call an ambulance now (108)");
    expect(text).toContain("Who to contact\n• ");
    expect(text).toContain("What I could not verify\n• ");
    expect(text).toContain("Confidence: ");
    expect(lines.at(-1)).toBe(en.card.shareFooter);
  });

  it("leaves out empty sections and says when nothing was verified", () => {
    const base = sample("rumour");
    const text = planText({ ...base, verified: false, card: { ...base.card, actions: [], contacts: [], couldnt_verify: [] } }, en.card);
    expect(text).not.toContain("Do this now");
    expect(text).not.toContain("Who to contact");
    expect(text).toContain(en.card.notVerified);
  });
});
