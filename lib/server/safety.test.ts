import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/lib/languages";
import { ACTION_TYPES, CATEGORIES, FACT_STATUSES, RISK_LEVELS, URGENCIES, VERDICTS, type Action, type ActionCard } from "@/lib/schema";
import { EMERGENCY_NUMBERS } from "@/lib/emergency";
import { enforceSafety, fixEmergencyNumber, serviceNumber } from "./safety";

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

const action = (over: Partial<Action>): Action => ({
  title: "Do it",
  detail: "",
  urgency: "now",
  type: "info",
  payload: {},
  needs_confirmation: false,
  ...over,
});

const FIXED = new Set<string>(EMERGENCY_NUMBERS.map((e) => e.number));
const digits = (s: string) => s.replace(/\D/g, "");

describe("fixEmergencyNumber", () => {
  it("replaces a made-up ambulance number with 108", () => {
    expect(fixEmergencyNumber("Ambulance service", "1800-123-4567")).toBe("108");
  });
  it("maps a named service with a foreign number to that service", () => {
    expect(fixEmergencyNumber("Call the fire brigade", "999")).toBe("101");
  });
  it("maps foreign emergency numbers to 112 when no service is named", () => {
    expect(fixEmergencyNumber("Emergency", "911")).toBe("112");
    expect(fixEmergencyNumber("Help", "000")).toBe("112");
  });
  it("keeps the real fixed numbers and ordinary contacts", () => {
    expect(fixEmergencyNumber("Ambulance", "108")).toBe("108");
    expect(fixEmergencyNumber("Ambulance", "1 0 8")).toBe("108");
    expect(fixEmergencyNumber("Dr. Mehta, family doctor", "+91 98200 00000")).toBe("+91 98200 00000");
  });
  it("does not mistake words that merely appear near a service for the service", () => {
    expect(fixEmergencyNumber("Dr. Mehta, for your elder father", "+91 98200 00000")).toBe("+91 98200 00000");
    expect(fixEmergencyNumber("Ruby Hall emergency ward", "020 6645 5100")).toBe("020 6645 5100");
    expect(fixEmergencyNumber("Fireworks shop", "98200 11111")).toBe("98200 11111");
  });
});

describe("serviceNumber", () => {
  it.each([
    ["Call an ambulance", "108"],
    ["Police control room", "100"],
    ["Fire brigade", "101"],
    ["Fire", "101"],
    ["Disaster helpline", "1070"],
    ["Childline", "1098"],
    ["Elder helpline", "14567"],
    ["Senior citizens helpline", "14567"],
    ["Emergency services", "112"],
    // The same services named in each Indian language LifeSync answers in.
    ["एम्बुलेंस बुलाएँ", "108"],
    ["रुग्णवाहिका", "108"],
    ["অ্যাম্বুলেন্স", "108"],
    ["అంబులెన్స్", "108"],
    ["ஆம்புலன்ஸ்", "108"],
    ["એમ્બ્યુલન્સ", "108"],
    ["ایمبولینس", "108"],
    ["ಆಂಬ್ಯುಲೆನ್ಸ್", "108"],
    ["ଆମ୍ବୁଲାନ୍ସ", "108"],
    ["ആംബുലൻസ്", "108"],
    ["ਐਂਬੂਲੈਂਸ", "108"],
    ["पुलिस", "100"],
    ["پولیس", "100"],
    ["அவசர சேவை", "112"],
    ["आपत्ती व्यवस्थापन", "1070"],
  ])("%s → %s", (name, number) => {
    expect(serviceNumber(name)).toBe(number);
  });

  it("returns null for people and places", () => {
    expect(serviceNumber("Dr. Mehta")).toBeNull();
    expect(serviceNumber("Neighbour, Sunita")).toBeNull();
  });
});

describe("enforceSafety", () => {
  it("puts a 112 call first and adds 112 to contacts when risk is critical", () => {
    const card = enforceSafety(baseCard({ risk_level: "critical", actions: [action({ title: "Move the oxygen machine" })] }), { verified: true });
    expect(card.actions[0]).toMatchObject({ type: "call", payload: { phone: "112" }, needs_confirmation: true });
    expect(card.actions).toHaveLength(2);
    expect(card.contacts[0]?.number).toBe("112");
  });

  it("moves an existing emergency call to the top instead of duplicating it", () => {
    const card = enforceSafety(
      baseCard({
        risk_level: "critical",
        actions: [
          action({ title: "Pack documents", urgency: "today" }),
          action({ title: "Call ambulance", type: "call", payload: { phone: "108" }, needs_confirmation: true }),
        ],
      }),
      { verified: true },
    );
    expect(card.actions.map((a) => a.payload.phone)).toEqual(["108", undefined]);
  });

  it.each(LANGUAGES.map((l) => [l.english, l.code] as const))("writes the added 112 action in %s", (_, code) => {
    const card = enforceSafety(baseCard({ risk_level: "critical", language_code: code }), { verified: true });
    expect(card.actions[0]?.title).toContain("112");
    expect(card.contacts[0]?.name.length).toBeGreaterThan(3);
    if (code !== "en") expect(card.actions[0]?.title).not.toBe("Call 112 now");
  });

  it("requires confirmation for anything that contacts someone", () => {
    const card = enforceSafety(
      baseCard({
        actions: [
          action({ title: "Message neighbours", type: "message", payload: { message: "Help" } }),
          action({ title: "Open map", type: "navigate", payload: { destination: "X" } }),
        ],
      }),
      { verified: true },
    );
    expect(card.actions.map((a) => a.needs_confirmation)).toEqual([true, false]);
  });

  it("gives a service call with no number its fixed number", () => {
    const card = enforceSafety(baseCard({ actions: [action({ title: "Call an ambulance", type: "call" })] }), { verified: true });
    expect(card.actions[0]).toMatchObject({ type: "call", payload: { phone: "108" }, needs_confirmation: true });
  });

  it("turns actions that could not work into advice rather than dead buttons", () => {
    const card = enforceSafety(
      baseCard({
        actions: [
          action({ title: "Call Dr. Mehta", type: "call" }),
          action({ title: "Message family", type: "message", payload: { message: "  " } }),
          action({ title: "Go to hospital", type: "navigate" }),
        ],
      }),
      { verified: true },
    );
    expect(card.actions.map((a) => [a.type, a.needs_confirmation])).toEqual([
      ["info", false],
      ["info", false],
      ["info", false],
    ]);
  });

  it("drops contacts without a number and cleans the ones it keeps", () => {
    const card = enforceSafety(
      baseCard({
        contacts: [
          { name: "Local clinic", number: "unknown", why: "" },
          { name: "Dr. Mehta", number: "+91 (98200) 00000 ext", why: "Family doctor" },
        ],
      }),
      { verified: true },
    );
    expect(card.contacts).toEqual([{ name: "Dr. Mehta", number: "+91 98200 00000", why: "Family doctor" }]);
  });

  it("caps confidence when the card was not verified", () => {
    expect(enforceSafety(baseCard({ confidence: 92 }), { verified: false }).confidence).toBe(40);
    expect(enforceSafety(baseCard({ confidence: 92.4 }), { verified: true }).confidence).toBe(92);
  });

  it("bounds runaway model output and invalid language codes", () => {
    const card = enforceSafety(
      baseCard({ situation: "x".repeat(5_000), couldnt_verify: Array.from({ length: 50 }, (_, i) => `item ${i}`), language_code: '"><script>' }),
      { verified: true },
    );
    expect(card.situation.length).toBeLessThanOrEqual(1_000);
    expect(card.couldnt_verify).toHaveLength(12);
    expect(card.language_code).toBe("en");
  });

  it("does not mutate its input", () => {
    const input = baseCard({ risk_level: "critical" });
    enforceSafety(input, { verified: true });
    expect(input.actions).toHaveLength(0);
  });
});

// Any card the model could return, valid under the schema.
const text = fc.string({ maxLength: 40 });
const phone = fc.oneof(
  fc.constant(""),
  fc.constantFrom("108", "112", "911", "999", "+91 98200 00000", "1800-123-4567", "*#06#", "abc"),
  fc.string({ maxLength: 15 }),
);
const arbAction = fc.record({
  title: fc.oneof(text, fc.constantFrom("Call an ambulance", "Call police", "Call Dr. Mehta", "पुलिस को कॉल करें")),
  detail: text,
  urgency: fc.constantFrom(...URGENCIES),
  type: fc.constantFrom(...ACTION_TYPES),
  payload: fc.record({
    phone,
    message: fc.option(text, { nil: undefined }),
    time_iso: fc.option(text, { nil: undefined }),
    destination: fc.option(text, { nil: undefined }),
  }),
  needs_confirmation: fc.boolean(),
});
const arbCard: fc.Arbitrary<ActionCard> = fc.record({
  situation: text,
  language_code: fc.oneof(fc.constantFrom(...LANGUAGES.map((l) => l.code), "hi-IN", "xx"), text),
  category: fc.constantFrom(...CATEGORIES),
  risk_level: fc.constantFrom(...RISK_LEVELS),
  risk_reason: text,
  verified_facts: fc.array(fc.record({ claim: text, source: text, status: fc.constantFrom(...FACT_STATUSES) }), { maxLength: 4 }),
  actions: fc.array(arbAction, { maxLength: 10 }),
  contacts: fc.array(fc.record({ name: fc.oneof(text, fc.constantFrom("Ambulance", "Fire brigade", "Neighbour")), number: phone, why: text }), {
    maxLength: 8,
  }),
  health_card: fc.constant(null),
  rumor_verdict: fc.option(fc.record({ verdict: fc.constantFrom(...VERDICTS), correction: text }), { nil: null }),
  confidence: fc.double({ min: -50, max: 500, noNaN: true }),
  couldnt_verify: fc.array(text, { maxLength: 3 }),
  critic_notes: fc.array(text, { maxLength: 3 }),
  spoken_summary: text,
});

describe("enforceSafety invariants (property-based)", () => {
  it("holds for every card the model could produce", () => {
    fc.assert(
      fc.property(arbCard, fc.boolean(), (input, verified) => {
        const snapshot = structuredClone(input);
        const card = enforceSafety(input, { verified });

        // Never mutates the model's card.
        expect(input).toEqual(snapshot);
        // Confidence is a whole percentage, and an unchecked card never looks confident.
        expect(Number.isInteger(card.confidence)).toBe(true);
        expect(card.confidence).toBeGreaterThanOrEqual(0);
        expect(card.confidence).toBeLessThanOrEqual(verified ? 100 : 40);
        // Bounded lists.
        expect(card.actions.length).toBeLessThanOrEqual(6);
        expect(card.contacts.length).toBeLessThanOrEqual(5);
        for (const a of card.actions) {
          // Nothing that reaches another person happens without a confirmation tap.
          if (a.type === "call" || a.type === "message") expect(a.needs_confirmation).toBe(true);
          // Every call button can actually dial.
          if (a.type === "call") expect(digits(a.payload.phone ?? "").length).toBeGreaterThanOrEqual(3);
          // A foreign emergency number never survives on a call.
          if (a.type === "call") expect(["911", "999", "000"]).not.toContain(digits(a.payload.phone ?? ""));
        }
        for (const c of card.contacts) expect(digits(c.number).length).toBeGreaterThanOrEqual(3);
        // Life-threatening: emergency services come first, and 112 is always listed.
        if (card.risk_level === "critical") {
          expect(card.actions[0]?.type).toBe("call");
          expect(FIXED.has(digits(card.actions[0]?.payload.phone ?? ""))).toBe(true);
          expect(card.contacts.some((c) => digits(c.number) === "112")).toBe(true);
        }
        expect(card.language_code).toMatch(/^[a-z]{2,3}(-[a-z0-9]{2,8}){0,3}$/i);
      }),
      { numRuns: 400 },
    );
  });

  it("is idempotent: running it twice changes nothing more", () => {
    fc.assert(
      fc.property(arbCard, fc.boolean(), (input, verified) => {
        const once = enforceSafety(input, { verified });
        expect(enforceSafety(once, { verified })).toEqual(once);
      }),
      { numRuns: 200 },
    );
  });
});
