import { describe, expect, it } from "vitest";
import type { ActionCard } from "@/lib/schema";
import { enforceSafety, fixEmergencyNumber } from "./safety";

const baseCard = (over: Partial<ActionCard> = {}): ActionCard => ({
  situation: "Water is entering the house.",
  language_code: "en",
  category: "disaster",
  risk_level: "high",
  risk_reason: "Rising water.",
  verified_facts: [],
  actions: [],
  contacts: [],
  health_card: null,
  rumor_verdict: null,
  confidence: 90,
  couldnt_verify: [],
  critic_notes: [],
  spoken_summary: "Move to higher ground.",
  ...over,
});

describe("fixEmergencyNumber", () => {
  it("replaces a made-up ambulance number with 108", () => {
    expect(fixEmergencyNumber("Ambulance service", "1800-123-4567")).toBe("108");
  });
  it("understands Hindi service names", () => {
    expect(fixEmergencyNumber("पुलिस", "12345")).toBe("100");
  });
  it("maps foreign emergency numbers to 112", () => {
    expect(fixEmergencyNumber("Emergency", "911")).toBe("112");
  });
  it("keeps the real fixed numbers and ordinary contacts", () => {
    expect(fixEmergencyNumber("Ambulance", "108")).toBe("108");
    expect(fixEmergencyNumber("Dr. Mehta, family doctor", "+91 98200 00000")).toBe("+91 98200 00000");
  });
});

describe("enforceSafety", () => {
  it("puts a 112 call first and adds 112 to contacts when risk is critical", () => {
    const card = enforceSafety(
      baseCard({
        risk_level: "critical",
        actions: [{ title: "Move the oxygen machine", detail: "", urgency: "now", type: "info", payload: {}, needs_confirmation: false }],
      }),
      { verified: true }
    );
    expect(card.actions[0]).toMatchObject({ type: "call", payload: { phone: "112" }, needs_confirmation: true });
    expect(card.actions).toHaveLength(2);
    expect(card.contacts[0]?.number).toBe("112");
  });

  it("moves an existing emergency call to the top instead of duplicating it", () => {
    const card = enforceSafety(
      baseCard({
        risk_level: "critical",
        actions: [
          { title: "Pack documents", detail: "", urgency: "today", type: "info", payload: {}, needs_confirmation: false },
          { title: "Call ambulance", detail: "", urgency: "now", type: "call", payload: { phone: "108" }, needs_confirmation: true },
        ],
      }),
      { verified: true }
    );
    expect(card.actions.map((a) => a.payload.phone)).toEqual(["108", undefined]);
  });

  it("uses the card's language for the added action", () => {
    const card = enforceSafety(baseCard({ risk_level: "critical", language_code: "hi" }), { verified: true });
    expect(card.actions[0]?.title).toContain("112");
    expect(card.actions[0]?.title).toMatch(/[ऀ-ॿ]/);
  });

  it("requires confirmation for anything that contacts someone", () => {
    const card = enforceSafety(
      baseCard({
        actions: [
          { title: "Message neighbours", detail: "", urgency: "now", type: "message", payload: { message: "Help" }, needs_confirmation: false },
          { title: "Open map", detail: "", urgency: "now", type: "navigate", payload: { destination: "X" }, needs_confirmation: false },
        ],
      }),
      { verified: true }
    );
    expect(card.actions.map((a) => a.needs_confirmation)).toEqual([true, false]);
  });

  it("overrides a wrong number on an emergency action", () => {
    const card = enforceSafety(
      baseCard({ actions: [{ title: "Call the fire brigade", detail: "", urgency: "now", type: "call", payload: { phone: "999" }, needs_confirmation: true }] }),
      { verified: true }
    );
    expect(card.actions[0]?.payload.phone).toBe("112");
  });

  it("caps confidence when the card was not verified", () => {
    expect(enforceSafety(baseCard({ confidence: 92 }), { verified: false }).confidence).toBe(40);
    expect(enforceSafety(baseCard({ confidence: 92 }), { verified: true }).confidence).toBe(92);
  });

  it("does not mutate its input", () => {
    const input = baseCard({ risk_level: "critical" });
    enforceSafety(input, { verified: true });
    expect(input.actions).toHaveLength(0);
  });
});
