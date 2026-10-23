"use client";

import { LANGUAGES, type LanguageCode } from "@/lib/languages";
import { useLanguage } from "./LanguageProvider";
import { ChevronDownIcon, GlobeIcon } from "./Icons";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <label className="relative flex h-9 items-center rounded-full text-charcoal transition-colors hover:bg-cloud">
      <span className="sr-only">Language</span>
      <GlobeIcon size={16} className="pointer-events-none absolute start-3" />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as LanguageCode)}
        className="h-9 cursor-pointer appearance-none rounded-full bg-transparent ps-9 pe-8 text-caption font-medium text-graphite outline-offset-2"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
            {l.code !== "en" ? ` · ${l.english}` : ""}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={14} className="pointer-events-none absolute end-3" />
    </label>
  );
}
