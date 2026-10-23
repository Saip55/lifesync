"use client";

import { useEffect } from "react";
import { Workspace } from "../Workspace";
import { useLanguage } from "../LanguageProvider";
import { CheckIcon, LockIcon, MessageIcon, PhoneIcon, QuestionIcon, ShieldIcon } from "../Icons";
import { Reveal } from "./Reveal";

const FLOW_ICONS = [MessageIcon, ShieldIcon, CheckIcon];
const FLOW_TINTS = ["bg-peach text-peach-ink", "bg-sky text-sky-ink", "bg-sage text-sage-ink"];
const FAQ_ICONS = [QuestionIcon, LockIcon, PhoneIcon];

export function TryPage() {
  const { lang, t } = useLanguage();
  const p = t.tryPage;

  // Always open at the top, even when arriving from a link low on the home page.
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <main id="main" tabIndex={-1} className="relative isolate outline-none">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[520px] animate-fade bg-[radial-gradient(55%_70%_at_80%_0%,rgba(244,166,109,0.14),transparent_70%),radial-gradient(45%_60%_at_5%_0%,rgba(150,171,138,0.14),transparent_70%)]"
      />

      <section className="mx-auto max-w-[1240px] px-4 pt-10 pb-8 sm:px-6 sm:pt-14 sm:pb-10">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto] lg:gap-16">
          <div key={lang}>
            <p className="flex w-fit animate-rise items-center gap-2 rounded-full border border-hairline bg-canvas/80 py-1 ps-2 pe-3 text-[0.8125rem] font-medium text-charcoal shadow-seg">
              <span className="size-2 animate-pulse-ring rounded-full bg-sage-ink" aria-hidden="true" />
              {p.eyebrow}
            </p>
            <h1 className="mt-5 animate-word font-display text-[2.125rem] leading-[1.1] font-medium tracking-[-0.035em] text-graphite sm:text-[2.875rem]">
              {p.title}
            </h1>
            <p className="mt-4 max-w-[600px] animate-rise text-lead leading-[1.75rem] text-charcoal" style={{ animationDelay: "120ms" }}>
              {p.body}
            </p>
          </div>

          {/* Describe → We check → You act */}
          <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0" aria-label={p.title}>
            {p.flow.map((s, i) => {
              const Icon = FLOW_ICONS[i] ?? CheckIcon;
              return (
                <li
                  key={s.title}
                  className="relative flex animate-rise items-center gap-3 sm:w-[168px] sm:flex-col sm:items-start sm:gap-2.5"
                  style={{ animationDelay: `${200 + i * 120}ms` }}
                >
                  <span className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-full shadow-seg ${FLOW_TINTS[i]}`}>
                    <Icon size={17} />
                  </span>
                  {i < p.flow.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute start-10 end-2 top-5 hidden h-px bg-gradient-to-r from-graphite/25 to-transparent sm:block rtl:bg-gradient-to-l"
                    />
                  )}
                  <span>
                    <span className="block text-caption font-semibold text-graphite">
                      <span className="text-quiet tabular-nums">{i + 1}.</span> {s.title}
                    </span>
                    <span className="block text-utility text-quiet">{s.body}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-3 sm:px-6">
        <Workspace />
      </section>

      <section className="mx-auto max-w-[1240px] px-4 pt-20 pb-24 sm:px-6 sm:pt-24">
        <Reveal>
          <h2 className="font-display text-[1.625rem] font-medium tracking-[-0.02em] text-graphite">{p.goodToKnow}</h2>
        </Reveal>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {p.faq.map((f, i) => {
            const Icon = FAQ_ICONS[i] ?? QuestionIcon;
            const urgent = i === p.faq.length - 1;
            return (
              <Reveal key={f.q} delay={i * 90} className="h-full">
                <div
                  className={`flex h-full flex-col rounded-[18px] border p-5 transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.25)] ${urgent ? "border-critical/15 bg-critical-soft/60" : i === 0 ? "border-sage bg-sage/50" : "border-sky bg-sky/50"}`}
                >
                  <Icon size={18} className={urgent ? "text-critical" : i === 0 ? "text-sage-ink" : "text-sky-ink"} />
                  <h3 className="mt-4 text-body font-semibold text-graphite">{f.q}</h3>
                  <p className="mt-1.5 text-caption text-charcoal">{f.a}</p>
                  {urgent && (
                    <a
                      href="tel:112"
                      className="mt-5 inline-flex h-10 w-fit items-center gap-2 rounded-full bg-critical px-4 text-caption font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <PhoneIcon size={15} />
                      {p.callNow}
                    </a>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </main>
  );
}
