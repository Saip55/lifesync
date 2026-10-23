// Every language the model can answer in. The server uses this list to label and validate replies.
export const LANGUAGES = [
  { code: "en", english: "English", native: "English", dir: "ltr" },
  { code: "hi", english: "Hindi", native: "हिन्दी", dir: "ltr" },
  { code: "bn", english: "Bengali", native: "বাংলা", dir: "ltr" },
  { code: "mr", english: "Marathi", native: "मराठी", dir: "ltr" },
  { code: "te", english: "Telugu", native: "తెలుగు", dir: "ltr" },
  { code: "ta", english: "Tamil", native: "தமிழ்", dir: "ltr" },
  { code: "gu", english: "Gujarati", native: "ગુજરાતી", dir: "ltr" },
  { code: "ur", english: "Urdu", native: "اردو", dir: "rtl" },
  { code: "kn", english: "Kannada", native: "ಕನ್ನಡ", dir: "ltr" },
  { code: "or", english: "Odia", native: "ଓଡ଼ିଆ", dir: "ltr" },
  { code: "ml", english: "Malayalam", native: "മലയാളം", dir: "ltr" },
  { code: "pa", english: "Punjabi", native: "ਪੰਜਾਬੀ", dir: "ltr" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const isLanguageCode = (code: string | null | undefined): code is LanguageCode => LANGUAGES.some((l) => l.code === code);

export function getLanguage(code: string) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

// The site itself is fully translated into the six most widely spoken of these.
export type SiteLanguageCode = "en" | "hi" | "bn" | "mr" | "te" | "ta";
const SITE_CODES: readonly string[] = ["en", "hi", "bn", "mr", "te", "ta"] satisfies SiteLanguageCode[];
type SiteLanguage = Extract<(typeof LANGUAGES)[number], { code: SiteLanguageCode }>;
export const SITE_LANGUAGES = LANGUAGES.filter((l): l is SiteLanguage => SITE_CODES.includes(l.code));

export const isSiteLanguage = (code: string | null | undefined): code is SiteLanguageCode => SITE_LANGUAGES.some((l) => l.code === code);
