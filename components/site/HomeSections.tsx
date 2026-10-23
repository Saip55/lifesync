"use client";

import Link from "next/link";
import { EMERGENCY_NUMBERS } from "@/lib/emergency";
import { useLanguage } from "../LanguageProvider";
import { ArrowRightIcon, CheckIcon, GlobeIcon, LockIcon, MessageIcon, PhoneIcon, QuestionIcon, ShieldIcon, XIcon } from "../Icons";
import { InputsBento } from "./InputsBento";
import { Landscape } from "./Landscape";
import { Reveal } from "./Reveal";
import { UseCases } from "./UseCases";

const SAFETY_ICONS = [ShieldIcon, QuestionIcon, CheckIcon, PhoneIcon, MessageIcon, LockIcon];

// Each step borrows a landscape tint so the sequence reads at a glance.
const STEP_TINTS = ["bg-sky text-sky-ink", "bg-sand text-sand-ink", "bg-peach text-peach-ink", "bg-sage text-sage-ink"];

function SectionHeading({ title, body, tone = "light" }: { title: string; body: string; tone?: "light" | "dark" }) {
  return (
    <div className="max-w-[640px]">
      <h2
        className={`font-display text-[2rem] leading-[1.15] font-medium tracking-[-0.03em] sm:text-[2.625rem] ${
          tone === "dark" ? "text-canvas" : "text-graphite"
        }`}
      >
        {title}
      </h2>
      <p className={`mt-4 text-lead leading-[1.75rem] ${tone === "dark" ? "text-dusk-text" : "text-charcoal"}`}>{body}</p>
    </div>
  );
}

export function HomeSections() {
  const { t } = useLanguage();

  return (
    <>
      {/* Proof */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <ul className="flex flex-wrap justify-center gap-2.5 py-6">
          {[
            { Icon: ShieldIcon, label: t.proof.factChecked, tint: "bg-sage text-sage-ink" },
            { Icon: GlobeIcon, label: t.proof.languages, tint: "bg-sky text-sky-ink" },
            { Icon: LockIcon, label: t.proof.private, tint: "bg-peach text-peach-ink" },
          ].map(({ Icon, label, tint }, i) => (
            <li key={label}>
              <Reveal delay={i * 100} className={`flex items-center gap-2 rounded-full px-4 py-2 text-caption font-semibold ${tint}`}>
                <Icon size={16} />
                {label}
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* Inputs */}
      <section id="inputs" className="mx-auto max-w-[1240px] px-4 pt-24 sm:px-6 sm:pt-32">
        <Reveal>
          <SectionHeading title={t.inputs.title} body={t.inputs.body} />
        </Reveal>
        <div className="mt-12">
          <InputsBento />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative mx-auto max-w-[1240px] px-4 pt-24 sm:px-6 sm:pt-32">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-16 -z-10 h-[420px] rounded-[40px] bg-[radial-gradient(60%_80%_at_20%_0%,rgba(225,234,237,0.9),transparent_70%)]"
        />
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <Reveal>
            <SectionHeading title={t.how.title} body={t.how.body} />
            <ol className="mt-10 border-t border-hairline">
              {t.how.steps.map((s, i) => (
                <li key={s.title} className="border-b border-hairline">
                  <Reveal delay={150 + i * 110} className="flex gap-5 py-5">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-full text-caption font-semibold ${STEP_TINTS[i]}`}>{i + 1}</span>
                    <div>
                      <h3 className="text-body font-semibold text-graphite">{s.title}</h3>
                      <p className="mt-0.5 text-caption text-quiet">{s.body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={120} className="lg:sticky lg:top-[140px]">
            <FactCheckIllustration />
          </Reveal>
        </div>
      </section>

      {/* Safety: the one dark section */}
      <section id="safety" className="mx-auto max-w-[1240px] px-2 pt-24 sm:px-6 sm:pt-32">
        <div className="relative isolate overflow-hidden rounded-[28px] bg-dusk px-5 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
          <span className="absolute -end-32 -top-40 -z-10 size-[520px] rounded-full bg-sun/25 blur-[120px]" aria-hidden="true" />
          <span className="absolute -start-40 bottom-0 -z-10 size-[420px] rounded-full bg-sage-ink/25 blur-[120px]" aria-hidden="true" />

          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <Reveal>
              <SectionHeading tone="dark" title={t.safety.title} body={t.safety.body} />
            </Reveal>
            <Reveal delay={120}>
              <ul className="grid gap-x-8 sm:grid-cols-2">
                {t.safety.rules.map(({ title, body }, i) => {
                  const Icon = SAFETY_ICONS[i] ?? ShieldIcon;
                  return (
                    <li key={title} className="border-t border-dusk-line">
                      <Reveal delay={i * 80} className="flex gap-4 py-5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sun/15 text-sun">
                          <Icon size={18} />
                        </span>
                        <div>
                          <h3 className="text-body font-semibold text-canvas">{title}</h3>
                          <p className="mt-1 text-caption text-dusk-text">{body}</p>
                        </div>
                      </Reveal>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </div>

          <Reveal className="mt-14 border-t border-dusk-line pt-8">
            <p className="text-caption font-medium text-dusk-text">{t.safety.numbersNote}</p>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:grid-cols-7">
              {EMERGENCY_NUMBERS.map((e) => (
                <li key={e.number}>
                  <a href={`tel:${e.number}`} className="group block">
                    <span className="block font-display text-[1.875rem] leading-none font-medium tracking-[-0.02em] text-canvas transition-colors group-hover:text-sun">
                      {e.number}
                    </span>
                    <span className="mt-1.5 block text-utility text-dusk-text">{t.safety.numbers[e.number]}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Use cases */}
      <section id="cases" className="mx-auto max-w-[1240px] px-4 pt-24 sm:px-6 sm:pt-32">
        <UseCases />
      </section>

      {/* Closing CTA over the landscape */}
      <section className="mx-auto max-w-[1240px] px-2 py-24 sm:px-6 sm:py-32">
        <Reveal className="relative isolate overflow-hidden rounded-[28px] px-5 pt-16 pb-40 text-center sm:pt-20 sm:pb-56">
          <Landscape />
          <div className="relative">
            <h2 className="mx-auto max-w-[620px] font-display text-[2.125rem] leading-[1.15] font-medium tracking-[-0.03em] text-graphite sm:text-[3rem]">
              {t.cta.title}
            </h2>
            <p className="mx-auto mt-4 max-w-[520px] text-lead leading-[1.75rem] text-charcoal">{t.cta.body}</p>
            <Link
              href="/try"
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-graphite px-7 py-3.5 text-body font-semibold text-canvas transition-colors hover:bg-graphite-hover"
            >
              {t.cta.button}
              <ArrowRightIcon size={18} className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}

// A small, static view of the critic pass: draft claims on the left, checked claims on the right.
function FactCheckIllustration() {
  const h = useLanguage().t.how;
  const statuses = ["verified", "removed", "verified", "unverified"] as const;
  const chip = {
    verified: { label: h.verified, cls: "bg-sage text-sage-ink", Icon: CheckIcon },
    removed: { label: h.removed, cls: "bg-critical-soft text-critical", Icon: XIcon },
    unverified: { label: h.unverified, cls: "bg-cloud text-quiet", Icon: QuestionIcon },
  };

  return (
    <div className="rounded-[18px] bg-[linear-gradient(165deg,#dfe8eb_0%,#eee8dc_60%,#f6dcc4_100%)] p-3 sm:p-4" aria-hidden="true">
      <div className="grid gap-[10px] sm:grid-cols-2">
        <div className="rounded-card bg-canvas/60 p-4">
          <p className="text-utility font-medium text-quiet">{h.draft}</p>
          <ul className="mt-3 divide-y divide-hairline">
            {h.claims.map((claim) => (
              <li key={claim} className="py-3 text-caption text-charcoal">
                {claim}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card bg-canvas p-4 shadow-overlay">
          <p className="flex items-center gap-1.5 text-utility font-medium text-graphite">
            <ShieldIcon size={14} /> {h.after}
          </p>
          <ul className="mt-3 divide-y divide-hairline">
            {h.claims.map((claim, i) => {
              const status = statuses[i] ?? "unverified";
              const c = chip[status];
              return (
                <li key={claim} className="py-3">
                  <span className={`text-caption ${status === "removed" ? "text-quiet line-through decoration-quiet" : "text-graphite"}`}>{claim}</span>
                  <span className={`mt-1.5 flex w-fit items-center gap-1 rounded-badge px-1.5 py-0.5 text-utility font-medium ${c.cls}`}>
                    <c.Icon size={12} strokeWidth={2.2} />
                    {c.label}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex items-center gap-3 border-t border-hairline pt-3">
            <span className="text-utility text-quiet">{h.confidence}</span>
            <span className="h-1.5 flex-1 rounded-full bg-black/[0.07]">
              <span className="block h-full w-[78%] rounded-full bg-sage-ink" />
            </span>
            <span className="text-utility font-semibold text-graphite tabular-nums">78%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
