"use client";

import { LANGUAGES } from "@/lib/languages";
import { useLanguage } from "../LanguageProvider";

export function LanguageGrid() {
  const { lang, setLang } = useLanguage();

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {LANGUAGES.map((l) => {
        const active = lang === l.code;
        return (
          <li key={l.code}>
            <button
              type="button"
              onClick={() => setLang(l.code)}
              aria-pressed={active}
              className={`flex w-full items-baseline justify-between gap-3 rounded-card border px-5 py-5 text-start transition-colors ${
                active ? "border-graphite/30 bg-canvas shadow-seg" : "border-transparent bg-cloud hover:bg-paper"
              }`}
            >
              <span lang={l.code} dir={l.dir} className="font-display text-[26px] leading-tight font-medium text-graphite">
                {l.native}
              </span>
              <span className="text-utility text-quiet">{l.english}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
