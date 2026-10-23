"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getLanguage, type LanguageCode } from "@/lib/languages";

type LanguageContextValue = { lang: LanguageCode; setLang: (code: LanguageCode) => void };

const LanguageContext = createContext<LanguageContextValue>({ lang: "en", setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LanguageCode>("en");

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = getLanguage(lang).dir;
  }, [lang]);

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
