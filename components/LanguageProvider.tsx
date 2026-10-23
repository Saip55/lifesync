"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getLanguage, isSiteLanguage, type SiteLanguageCode } from "@/lib/languages";
import { DICTIONARIES, LANG_STORAGE_KEY, type Dict } from "@/lib/i18n";

type LanguageContextValue = { lang: SiteLanguageCode; setLang: (code: SiteLanguageCode) => void; t: Dict };

const LanguageContext = createContext<LanguageContextValue>({ lang: "en", setLang: () => {}, t: DICTIONARIES.en });

// Pages prerender in English. A saved choice is applied after hydration; the inline script in
// app/layout.tsx keeps the page hidden until then so the English text never flashes.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SiteLanguageCode>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      // Storage can be blocked; English is a safe default.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage once after hydration
    if (isSiteLanguage(stored)) setLangState(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = getLanguage(lang).dir;
    if (ready) root.removeAttribute("data-lang-pending");
  }, [lang, ready]);

  const setLang = useCallback((code: SiteLanguageCode) => {
    setLangState(code);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, code);
    } catch {
      // Not saved, but the switch still applies for this visit.
    }
  }, []);

  return <LanguageContext.Provider value={{ lang, setLang, t: DICTIONARIES[lang] }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
