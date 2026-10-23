"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getLanguage, isSiteLanguage, type SiteLanguageCode } from "@/lib/languages";
import { en, LANG_STORAGE_KEY, loadDictionary, type Dict } from "@/lib/i18n";

type LanguageContextValue = { lang: SiteLanguageCode; setLang: (code: SiteLanguageCode) => void; t: Dict };

const LanguageContext = createContext<LanguageContextValue>({ lang: "en", setLang: () => {}, t: en });

// Pages prerender in English. A saved choice is applied after hydration; the inline script in
// app/layout.tsx keeps the page hidden until then so the English text never flashes.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ lang: SiteLanguageCode; t: Dict }>({ lang: "en", t: en });
  const [ready, setReady] = useState(false);
  // Only the most recent choice is applied, even if an earlier dictionary arrives later.
  const latest = useRef(0);

  const apply = useCallback(async (code: SiteLanguageCode) => {
    const ticket = ++latest.current;
    try {
      const t = await loadDictionary(code);
      if (ticket === latest.current) setState({ lang: code, t });
    } catch {
      // Offline or blocked chunk: stay in the current language rather than break the page.
    }
  }, []);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      // Storage can be blocked; English is a safe default.
    }
    if (!isSiteLanguage(stored) || stored === "en") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage once after hydration
      setReady(true);
      return;
    }
    void apply(stored).finally(() => setReady(true));
  }, [apply]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = state.lang;
    root.dir = getLanguage(state.lang).dir;
    if (ready) root.removeAttribute("data-lang-pending");
  }, [state.lang, ready]);

  const setLang = useCallback(
    (code: SiteLanguageCode) => {
      void apply(code);
      try {
        localStorage.setItem(LANG_STORAGE_KEY, code);
      } catch {
        // Not saved, but the switch still applies for this visit.
      }
    },
    [apply],
  );

  return <LanguageContext.Provider value={{ lang: state.lang, setLang, t: state.t }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
