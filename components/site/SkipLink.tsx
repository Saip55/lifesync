"use client";

import { useLanguage } from "../LanguageProvider";

// First focusable element on every page: jumps keyboard and screen-reader users past the header.
export function SkipLink() {
  const { t } = useLanguage();
  return (
    <a
      href="#main"
      className="fixed start-3 top-3 z-50 -translate-y-24 rounded-full bg-graphite px-5 py-3 text-body font-semibold text-canvas shadow-overlay transition-transform focus:translate-y-0"
    >
      {t.header.skip}
    </a>
  );
}
