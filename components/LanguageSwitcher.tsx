"use client";

import { SITE_LANGUAGES, type SiteLanguageCode } from "@/lib/languages";
import { useLanguage } from "./LanguageProvider";
import { ChevronDownIcon, GlobeIcon } from "./Icons";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();

  return (
    <label className="relative flex h-9 items-center rounded-full text-charcoal transition-colors hover:bg-black/[0.05]">
      <span className="sr-only">{t.header.language}</span>
      <GlobeIcon size={15} className="pointer-events-none absolute start-2.5" />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as SiteLanguageCode)}
        className="h-9 cursor-pointer appearance-none rounded-full bg-transparent ps-8 pe-7 text-[0.875rem] font-medium text-graphite outline-offset-2"
      >
        {SITE_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} label={l.native} lang={l.code}>
            {l.native}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={13} className="pointer-events-none absolute end-2.5" />
    </label>
  );
}
