"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LANGUAGES, SITE_LANGUAGES } from "@/lib/languages";
import { useLanguage } from "../LanguageProvider";
import { ArrowRightIcon } from "../Icons";
import { HeroDemo } from "./HeroDemo";

export function Hero() {
  const { lang, t } = useLanguage();
  const h = t.hero;

  return (
    <section className="relative isolate">
      {/* Quiet morning light behind the hero; no illustration, just tone. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[680px] animate-fade bg-[radial-gradient(60%_60%_at_85%_10%,rgba(244,166,109,0.16),transparent_70%),radial-gradient(50%_50%_at_10%_0%,rgba(150,171,138,0.14),transparent_70%)]"
      />
      <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[1.08fr_1fr] lg:gap-14 lg:pt-20 lg:pb-24">
        <div className="flex flex-col items-start">
          <p className="flex animate-rise items-center gap-2.5 rounded-full border border-hairline bg-canvas/80 py-1.5 ps-2.5 pe-3.5 text-[0.8125rem] font-medium text-charcoal shadow-seg backdrop-blur">
            <span className="size-2 animate-pulse-ring rounded-full bg-sage-ink" aria-hidden="true" />
            {h.eyebrow}
          </p>

          {/* key replays the reveal when the language changes */}
          <h1
            key={lang}
            className="mt-7 font-display text-[2.375rem] leading-[1.08] font-medium tracking-[-0.04em] text-graphite [font-variation-settings:'opsz'_96] sm:text-[3.375rem] xl:text-[3.875rem]"
          >
            <span className="block animate-word" style={{ animationDelay: "80ms" }}>
              {h.line1}
            </span>
            <span
              className="block animate-word bg-[linear-gradient(100deg,#2e2e2e_0%,#4b6847_55%,#85562a_100%)] bg-clip-text pb-[0.08em] text-transparent"
              style={{ animationDelay: "260ms" }}
            >
              {h.line2}
            </span>
          </h1>

          <p className="mt-6 max-w-[540px] animate-rise text-lead leading-[1.75rem] text-charcoal" style={{ animationDelay: "420ms" }}>
            {h.body}
          </p>

          <div className="mt-9 flex animate-rise flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6" style={{ animationDelay: "540ms" }}>
            <Link
              href="/try"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-graphite px-7 py-3.5 text-body font-semibold text-canvas shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_10px_24px_-10px_rgba(46,46,46,0.7)] transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-graphite-hover"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 start-0 w-1/3 -translate-x-[120%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-sheen"
              />
              {h.cta}
              <ArrowRightIcon size={18} className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100" />
            </Link>
            <Link
              href="/#how"
              className="text-body font-medium text-charcoal underline decoration-linen decoration-2 underline-offset-[6px] transition-colors hover:text-graphite hover:decoration-graphite"
            >
              {h.secondary}
            </Link>
          </div>

          <AskIn label={h.askIn} more={h.more} />
        </div>

        <div className="animate-rise" style={{ animationDelay: "300ms" }}>
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}

// "Ask in हिन्दी" — the language name cycles through every site language.
function AskIn({ label, more }: { label: string; more: string }) {
  const [i, setI] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % SITE_LANGUAGES.length), 2000);
    return () => clearInterval(id);
  }, []);

  const l = SITE_LANGUAGES[i] ?? LANGUAGES[0];
  return (
    <p className="mt-10 flex items-baseline gap-2 border-t border-hairline pt-5 text-caption text-quiet" aria-hidden="true">
      {label}
      <span
        key={l.code}
        lang={l.code}
        className="inline-block min-w-[4.5em] animate-word font-display text-[1.25rem] font-medium tracking-[-0.01em] text-graphite"
      >
        {l.native}
      </span>
      <span className="text-utility text-quiet">{more}</span>
    </p>
  );
}
