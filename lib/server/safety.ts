import "server-only";
import { EMERGENCY_NUMBERS } from "@/lib/emergency";
import type { Action, ActionCard, Contact } from "@/lib/schema";

// Safety rules enforced in code after every model call, so they hold even if a prompt is ignored.

const EMERGENCY_SET: ReadonlySet<string> = new Set(EMERGENCY_NUMBERS.map((e) => e.number));

// Which fixed number a contact or action is talking about, matched on English and common Indic words.
const SERVICES: { number: string; words: RegExp }[] = [
  { number: "108", words: /ambulance|एम्बुलेंस|एंबुलेंस|रुग्णवाहिका|অ্যাম্বুলেন্স|ஆம்புலன்ஸ்|అంబులెన్స్/i },
  { number: "100", words: /police|पुलिस|पोलीस|পুলিশ|காவல்|పోలీస్/i },
  { number: "101", words: /fire|अग्निशमन|दमकल|फायर|অগ্নি|தீயணைப்பு|అగ్నిమాపక/i },
  { number: "1070", words: /disaster|आपदा|आपत्ती|দুর্যোগ|பேரிடர்|విపత్తు/i },
  { number: "1098", words: /child ?line|child helpline|चाइल्ड/i },
  { number: "14567", words: /elder|senior citizen|बुजुर्ग|ज्येष्ठ/i },
  { number: "112", words: /emergency|आपातकाल|आपत्कालीन|জরুরি|அவசர|అత్యవసర/i },
];

// Numbers from other countries that a model may produce for "emergency".
const FOREIGN_EMERGENCY = new Set(["911", "999", "000", "119", "110"]);

const digits = (s: string) => s.replace(/\D/g, "");

/** Returns the fixed number for an emergency service named in `label`, or the original number. */
export function fixEmergencyNumber(label: string, number: string): string {
  const d = digits(number);
  if (FOREIGN_EMERGENCY.has(d)) return "112";
  if (EMERGENCY_SET.has(d)) return d;
  const service = SERVICES.find((s) => s.words.test(label));
  return service ? service.number : number;
}

const CALL_112: Record<string, { title: string; detail: string }> = {
  en: { title: "Call 112 now", detail: "Tell them what is happening and where you are." },
  hi: { title: "अभी 112 पर कॉल करें", detail: "बताइए क्या हो रहा है और आप कहाँ हैं।" },
  mr: { title: "आत्ताच 112 वर कॉल करा", detail: "काय घडत आहे आणि तुम्ही कुठे आहात ते सांगा." },
};

const EMERGENCY_CONTACT: Record<string, Contact> = {
  en: { name: "Emergency services", number: "112", why: "Police, fire and ambulance" },
  hi: { name: "आपातकालीन सेवा", number: "112", why: "पुलिस, फायर और एम्बुलेंस" },
  mr: { name: "आपत्कालीन सेवा", number: "112", why: "पोलीस, अग्निशमन आणि रुग्णवाहिका" },
};

const isEmergencyCall = (a: Action) => a.type === "call" && EMERGENCY_SET.has(digits(a.payload.phone ?? ""));

export function enforceSafety(input: ActionCard, opts: { verified: boolean }): ActionCard {
  const card = structuredClone(input);
  const lang = card.language_code.split("-")[0] ?? "en";

  card.contacts = card.contacts.map((c) => ({ ...c, number: fixEmergencyNumber(`${c.name} ${c.why}`, c.number) }));

  card.actions = card.actions.map((a) => {
    const phone = a.payload.phone ? fixEmergencyNumber(`${a.title} ${a.detail}`, a.payload.phone) : a.payload.phone;
    // Anything that reaches another person waits for the user's tap.
    const contactsSomeone = a.type === "call" || a.type === "message";
    return { ...a, payload: { ...a.payload, phone }, needs_confirmation: a.needs_confirmation || contactsSomeone };
  });

  if (card.risk_level === "critical") {
    // Life-threatening: the first action is always to reach emergency services.
    if (!card.actions[0] || !isEmergencyCall(card.actions[0])) {
      const existing = card.actions.findIndex(isEmergencyCall);
      const first =
        existing >= 0
          ? card.actions.splice(existing, 1)[0]
          : {
              ...(CALL_112[lang] ?? CALL_112.en),
              urgency: "now" as const,
              type: "call" as const,
              payload: { phone: "112" },
              needs_confirmation: true,
            };
      if (first) card.actions.unshift(first as Action);
    }
    if (!card.contacts.some((c) => digits(c.number) === "112")) {
      card.contacts.unshift(EMERGENCY_CONTACT[lang] ?? (EMERGENCY_CONTACT.en as Contact));
    }
  }

  // An unchecked card can never look confident.
  if (!opts.verified) card.confidence = Math.min(card.confidence, 40);
  card.confidence = Math.round(Math.max(0, Math.min(100, card.confidence)));

  card.actions = card.actions.slice(0, 6);
  card.contacts = card.contacts.slice(0, 5);
  return card;
}
