import "server-only";
import { EMERGENCY_NUMBERS } from "@/lib/emergency";
import { isLanguageCode, type LanguageCode } from "@/lib/languages";
import type { Action, ActionCard, Contact } from "@/lib/schema";

// Safety rules enforced in code after every model call, so they hold even if a prompt is ignored.

const EMERGENCY_SET: ReadonlySet<string> = new Set(EMERGENCY_NUMBERS.map((e) => e.number));

// A public service named in a contact's name or an action's title, in English and all 12 languages.
// The patterns name the service itself ("fire brigade", "elder helpline"), not words that merely
// appear near it, so "Dr. Mehta, for your elder father" keeps the doctor's number.
const SERVICES: { number: string; words: RegExp }[] = [
  {
    number: "108",
    words:
      /\bambulance\b|एम्बुलेंस|एंबुलेंस|ऐम्बुलेंस|रुग्णवाहिका|অ্যাম্বুলেন্স|ஆம்புலன்ஸ்|అంబులెన్స్|એમ્બ્યુલન્સ|ایمبولینس|ಆಂಬ್ಯುಲೆನ್ಸ್|ଆମ୍ବୁଲାନ୍ସ|ആംബുലൻസ്|ਐਂਬੂਲੈਂਸ/i,
  },
  {
    number: "101",
    words:
      /\bfire\s?(brigade|service|station|department|engine|fighters?)\b|^\W*fire\W*$|अग्निशमन|दमकल|फायर\s?ब्रिगेड|দমকল|ফায়ার\s?সার্ভিস|தீயணைப்பு|అగ్నిమాపక|ફાયર\s?બ્રિગેડ|અગ્નિશમન|فائر\s?بریگیڈ|ಅಗ್ನಿಶಾಮಕ|ଅଗ୍ନିଶମ|അഗ്നിശമന|ਫਾਇਰ\s?ਬ੍ਰਿਗੇਡ/i,
  },
  { number: "100", words: /\bpolice\b|पुलिस|पोलीस|পুলিশ|காவல்|போலீஸ்|పోలీస్|પોલીસ|پولیس|ಪೊಲೀಸ್|ପୋଲିସ|പോലീസ്|ਪੁਲਿਸ/i },
  {
    number: "1070",
    words:
      /\bdisaster\s+(help\s?line|management|control\s+room|response)\b|आपदा\s?(प्रबंधन|हेल्पलाइन|नियंत्रण)|आपत्ती\s?(व्यवस्थापन|हेल्पलाइन|नियंत्रण)|দুর্যোগ|பேரிடர்|విపత్తు|આપત્તિ|ڈیزاسٹر|ವಿಪತ್ತು|ବିପର୍ଯ୍ୟୟ|ദുരന്ത|ਆਫ਼ਤ/i,
  },
  { number: "1098", words: /\bchild\s?(line|help\s?line)\b|चाइल्ड\s?लाइन|बाल\s?हेल्पलाइन/i },
  {
    number: "14567",
    words: /\belder\s?(line|help\s?line)\b|\bsenior\s+citizens?'?\s+help\s?line\b|एल्डर\s?लाइन|(वरिष्ठ|ज्येष्ठ)\s?नागरिक\s?हेल्पलाइन/i,
  },
  {
    number: "112",
    words:
      /\bemergency\s+(services?|number|help\s?line|response)\b|आपातकालीन\s?सेवा|आपत्कालीन\s?सेवा|জরুরি\s?পরিষেবা|அவசர\s?சேவை|అత్యవసర\s?సేవ|ઇમરજન્સી\s?સેવા|ایمرجنسی\s?سروس|ತುರ್ತು\s?ಸೇವೆ|ଜରୁରୀ(କାଳୀନ)?\s?ସେବା|അടിയന്തര\s?സേവന|ਐਮਰਜੈਂਸੀ\s?ਸੇਵਾ/i,
  },
];

// Numbers from other countries that a model may produce for "emergency".
const FOREIGN_EMERGENCY = new Set(["911", "999", "000", "119", "110"]);

const digits = (s: string) => s.replace(/\D/g, "");

/** The fixed number of the public service a name or title refers to, if any. */
export function serviceNumber(name: string): string | null {
  return SERVICES.find((s) => s.words.test(name))?.number ?? null;
}

/** Returns the fixed number for an emergency service named in `name`, or the original number. */
export function fixEmergencyNumber(name: string, number: string): string {
  const d = digits(number);
  if (EMERGENCY_SET.has(d)) return d;
  const service = serviceNumber(name);
  if (service) return service;
  if (FOREIGN_EMERGENCY.has(d)) return "112";
  return number;
}

// The action and contact added when a critical card does not already start with an emergency call.
// Typed by language so a newly supported language cannot be forgotten here.
const CALL_112: Record<LanguageCode, { title: string; detail: string; name: string; why: string }> = {
  en: { title: "Call 112 now", detail: "Tell them what is happening and where you are.", name: "Emergency services", why: "Police, fire and ambulance" },
  hi: { title: "अभी 112 पर कॉल करें", detail: "बताइए क्या हो रहा है और आप कहाँ हैं।", name: "आपातकालीन सेवा", why: "पुलिस, फायर और एम्बुलेंस" },
  bn: { title: "এখনই 112-এ কল করুন", detail: "কী হচ্ছে আর আপনি কোথায় আছেন, তা জানান।", name: "জরুরি পরিষেবা", why: "পুলিশ, দমকল ও অ্যাম্বুলেন্স" },
  mr: { title: "आत्ताच 112 वर कॉल करा", detail: "काय घडत आहे आणि तुम्ही कुठे आहात ते सांगा.", name: "आपत्कालीन सेवा", why: "पोलीस, अग्निशमन आणि रुग्णवाहिका" },
  te: {
    title: "ఇప్పుడే 112కి కాల్ చేయండి",
    detail: "ఏం జరుగుతోందో, మీరు ఎక్కడ ఉన్నారో చెప్పండి.",
    name: "అత్యవసర సేవలు",
    why: "పోలీస్, అగ్నిమాపక, అంబులెన్స్",
  },
  ta: {
    title: "இப்போதே 112-ஐ அழையுங்கள்",
    detail: "என்ன நடக்கிறது, நீங்கள் எங்கே இருக்கிறீர்கள் என்று சொல்லுங்கள்.",
    name: "அவசர சேவைகள்",
    why: "காவல், தீயணைப்பு, ஆம்புலன்ஸ்",
  },
  gu: { title: "હમણાં જ 112 પર કૉલ કરો", detail: "શું થઈ રહ્યું છે અને તમે ક્યાં છો તે જણાવો.", name: "ઇમરજન્સી સેવાઓ", why: "પોલીસ, ફાયર અને એમ્બ્યુલન્સ" },
  ur: { title: "ابھی 112 پر کال کریں", detail: "بتائیں کہ کیا ہو رہا ہے اور آپ کہاں ہیں۔", name: "ایمرجنسی سروسز", why: "پولیس، فائر اور ایمبولینس" },
  kn: {
    title: "ಈಗಲೇ 112ಗೆ ಕರೆ ಮಾಡಿ",
    detail: "ಏನಾಗುತ್ತಿದೆ ಮತ್ತು ನೀವು ಎಲ್ಲಿದ್ದೀರಿ ಎಂದು ತಿಳಿಸಿ.",
    name: "ತುರ್ತು ಸೇವೆಗಳು",
    why: "ಪೊಲೀಸ್, ಅಗ್ನಿಶಾಮಕ ಮತ್ತು ಆಂಬ್ಯುಲೆನ್ಸ್",
  },
  or: { title: "ଏବେ 112କୁ କଲ୍ କରନ୍ତୁ", detail: "କ’ଣ ହେଉଛି ଏବଂ ଆପଣ କେଉଁଠି ଅଛନ୍ତି କୁହନ୍ତୁ।", name: "ଜରୁରୀକାଳୀନ ସେବା", why: "ପୋଲିସ, ଅଗ୍ନିଶମ ଓ ଆମ୍ବୁଲାନ୍ସ" },
  ml: {
    title: "ഇപ്പോൾ തന്നെ 112 വിളിക്കുക",
    detail: "എന്താണ് സംഭവിക്കുന്നതെന്നും നിങ്ങൾ എവിടെയാണെന്നും പറയുക.",
    name: "അടിയന്തര സേവനങ്ങൾ",
    why: "പോലീസ്, അഗ്നിശമന സേന, ആംബുലൻസ്",
  },
  pa: { title: "ਹੁਣੇ 112 ’ਤੇ ਕਾਲ ਕਰੋ", detail: "ਦੱਸੋ ਕੀ ਹੋ ਰਿਹਾ ਹੈ ਅਤੇ ਤੁਸੀਂ ਕਿੱਥੇ ਹੋ।", name: "ਐਮਰਜੈਂਸੀ ਸੇਵਾਵਾਂ", why: "ਪੁਲਿਸ, ਫਾਇਰ ਅਤੇ ਐਂਬੂਲੈਂਸ" },
};

function copyFor(languageCode: string) {
  const base = languageCode.split("-")[0];
  return isLanguageCode(base) ? CALL_112[base] : CALL_112.en;
}

const isEmergencyCall = (a: Action) => a.type === "call" && EMERGENCY_SET.has(digits(a.payload.phone ?? ""));

// Model output is untrusted: every string and list is bounded before it reaches the browser.
const MAX_STRING = 1_000;
const MAX_LIST = 12;
const BCP47 = /^[a-z]{2,3}(-[a-z0-9]{2,8}){0,3}$/i;

function bound<T>(value: T): T {
  if (typeof value === "string") return (value.length > MAX_STRING ? `${value.slice(0, MAX_STRING - 1)}…` : value) as T;
  if (Array.isArray(value)) return value.slice(0, MAX_LIST).map(bound) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, bound(v)])) as T;
  return value;
}

// A call, message or navigate action without what it needs would be a dead button: show it as advice instead.
function usable(a: Action): Action {
  const { phone, message, destination } = a.payload;
  const works =
    (a.type === "call" && digits(phone ?? "").length >= 3) ||
    (a.type === "message" && !!message?.trim()) ||
    (a.type === "navigate" && !!destination?.trim()) ||
    a.type === "reminder" ||
    a.type === "info";
  return works ? a : { ...a, type: "info", needs_confirmation: false };
}

export function enforceSafety(input: ActionCard, opts: { verified: boolean }): ActionCard {
  const card = bound(structuredClone(input));
  if (!BCP47.test(card.language_code)) card.language_code = "en";

  card.contacts = card.contacts
    .map((c) => ({
      ...c,
      number: fixEmergencyNumber(c.name, c.number)
        .replace(/[^\d+\s-]/g, "")
        .trim(),
    }))
    .filter((c) => digits(c.number).length >= 3);

  card.actions = card.actions.map((a) => {
    // A call to a named service gets its fixed number, whether the model gave a wrong one or none.
    const given = a.payload.phone?.trim() || undefined;
    const phone = a.type !== "call" ? given : given ? fixEmergencyNumber(a.title, given) : (serviceNumber(a.title) ?? undefined);
    const action = usable({ ...a, payload: { ...a.payload, phone } });
    // Anything that reaches another person waits for the user's tap.
    const contactsSomeone = action.type === "call" || action.type === "message";
    return { ...action, needs_confirmation: action.needs_confirmation || contactsSomeone };
  });

  if (card.risk_level === "critical") {
    const copy = copyFor(card.language_code);
    // Life-threatening: the first action is always to reach emergency services.
    if (!card.actions[0] || !isEmergencyCall(card.actions[0])) {
      const existing = card.actions.findIndex(isEmergencyCall);
      const first: Action =
        existing >= 0
          ? (card.actions.splice(existing, 1)[0] as Action)
          : { title: copy.title, detail: copy.detail, urgency: "now", type: "call", payload: { phone: "112" }, needs_confirmation: true };
      card.actions.unshift(first);
    }
    if (!card.contacts.some((c) => digits(c.number) === "112")) {
      card.contacts.unshift({ name: copy.name, number: "112", why: copy.why } satisfies Contact);
    }
  }

  // An unchecked card can never look confident.
  const confidence = Number.isFinite(card.confidence) ? card.confidence : 0;
  card.confidence = Math.round(Math.max(0, Math.min(opts.verified ? 100 : 40, confidence)));

  card.actions = card.actions.slice(0, 6);
  card.contacts = card.contacts.slice(0, 5);
  return card;
}
