"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogoMark } from "../Logo";
import { useLanguage } from "../LanguageProvider";
import { AlertIcon, CheckIcon, MicIcon, PhoneIcon, ShieldIcon, XIcon } from "../Icons";

// When each step of the demo lands, in ms from the start of a loop.
const TIMELINE = [0, 1100, 2000, 2900, 3700, 4500, 5400, 6200];
const FINAL = TIMELINE.length - 1;
const LOOP_MS = 11500;

// A looping, self-assembling action card: three messy inputs become one checked plan.
// Decorative, so it is exposed to assistive tech as a single described image.
export function HeroDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const d = useLanguage().t.demo;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timers: number[] = [];
    const stop = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    const play = () => {
      stop();
      TIMELINE.forEach((t, i) => timers.push(window.setTimeout(() => setStep(i), t)));
      timers.push(window.setTimeout(play, LOOP_MS));
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (reduce) return setStep(FINAL);
        if (entry?.isIntersecting) play();
        else stop();
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
    };
  }, []);

  const at = (n: number) => step >= n;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={d.aria}
      className="relative isolate overflow-hidden rounded-[24px] bg-[linear-gradient(165deg,#dfe8eb_0%,#eee8dc_52%,#f6dcc4_100%)] p-4 sm:p-7"
    >
      {/* Sun */}
      <span className="absolute -end-16 -top-20 -z-10 size-72 rounded-full bg-[#fbe3c8] opacity-90 blur-3xl" />
      <span className="absolute end-10 top-10 -z-10 size-24 rounded-full bg-[#f8d2ac] blur-[2px]" />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-start sm:gap-6">
        {/* Messy inputs */}
        <ul className="flex flex-wrap gap-2 sm:mt-6 sm:flex-col sm:gap-3">
          <InputChip done={at(1)}>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-peach text-peach-ink">
              <MicIcon size={14} />
            </span>
            <span className="flex h-5 items-center gap-[3px]">
              {[0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.8].map((h, i) => (
                <span
                  key={i}
                  className={`w-[3px] origin-center rounded-full bg-graphite/70 ${at(1) ? "" : "animate-wave"}`}
                  style={{ height: `${h * 20}px`, animationDelay: `${i * 110}ms` }}
                />
              ))}
            </span>
            <span lang="hi" className="text-utility text-quiet">
              0:12 हिन्दी
            </span>
          </InputChip>

          <InputChip done={at(1)} className="sm:ms-5">
            <span className="relative block h-11 w-9 shrink-0 rounded-[3px] bg-[#fffdf8] p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]">
              <span className="block font-display text-[0.5625rem] leading-none font-semibold text-sky-ink">Rx</span>
              <span className="mt-1 block h-[2px] w-6 rounded bg-graphite/30" />
              <span className="mt-1 block h-[2px] w-4 rounded bg-graphite/30" />
              <span className="mt-1 block h-[2px] w-5 rounded bg-graphite/30" />
            </span>
            <span className="text-utility leading-tight text-charcoal">
              {d.prescription}
              <br />
              <span className="text-quiet">{d.photo}</span>
            </span>
          </InputChip>

          <InputChip done={at(1)}>
            <span className="max-w-[150px] text-utility leading-snug text-charcoal">
              <span className="block text-quiet italic">{d.forwarded}</span>
              {d.forwardText}
            </span>
          </InputChip>
        </ul>

        {/* The card that builds itself */}
        <div className="rounded-card bg-canvas p-4 shadow-overlay sm:p-5">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="text-caption font-semibold text-graphite">{d.card}</span>
            <span className="ms-auto">
              {at(FINAL) ? (
                <span className="flex animate-stamp items-center gap-1 rounded-badge bg-sage px-2 py-0.5 text-utility font-medium text-sage-ink">
                  <ShieldIcon size={13} /> {d.factChecked}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-utility text-quiet">
                  <span className="size-1.5 animate-breathe rounded-full bg-sun" />
                  {at(3) ? d.checking : d.reading}
                </span>
              )}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 6].map((n) => (
              <span key={n} className="h-1 overflow-hidden rounded-full bg-black/[0.07]">
                <span
                  className={`block h-full rounded-full bg-graphite transition-[width] duration-700 ease-out ${at(n) ? "w-full" : "w-0"}`}
                />
              </span>
            ))}
          </div>

          <Row on={at(2)} className="mt-4">
            <div className="rounded-feature border-s-[3px] border-high bg-high-soft px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-caption font-semibold text-high">
                <AlertIcon size={15} /> {d.highRisk}
              </p>
              <p className="mt-0.5 text-utility text-charcoal">{d.riskBody}</p>
            </div>
          </Row>

          <ul className="mt-3 divide-y divide-hairline rounded-feature border border-hairline">
            <Fact on={at(3)} claim={d.fact1}>
              <Chip className="bg-sage text-sage-ink">
                <CheckIcon size={12} strokeWidth={2.4} /> {d.verified}
              </Chip>
            </Fact>
            <Fact on={at(4)} claim={d.fact2}>
              <Chip className="bg-critical-soft text-critical">
                <XIcon size={12} strokeWidth={2.4} /> {d.falseForward}
              </Chip>
            </Fact>
            <Fact on={at(5)} struck={at(5)} claim={d.fact3}>
              <Chip className="bg-cloud text-quiet">{d.removed}</Chip>
            </Fact>
          </ul>

          <Row on={at(6)} className="mt-3">
            <span className="flex h-10 items-center justify-center gap-2 rounded-full bg-graphite text-caption font-semibold text-canvas">
              <PhoneIcon size={15} /> {d.call}
            </span>
          </Row>

          <Row on={at(FINAL)} className="mt-3 flex items-center gap-3">
            <span className="text-utility text-quiet">{d.confidence}</span>
            <span className="h-1.5 flex-1 rounded-full bg-black/[0.07]">
              <span
                className={`block h-full rounded-full bg-sage-ink transition-[width] delay-150 duration-1000 ease-out ${at(FINAL) ? "w-[78%]" : "w-0"}`}
              />
            </span>
            <span className="text-utility font-semibold text-graphite tabular-nums">78%</span>
          </Row>
        </div>
      </div>
    </div>
  );
}

function InputChip({ done, className = "", children }: { done: boolean; className?: string; children: ReactNode }) {
  return (
    <li
      className={`relative flex w-fit items-center gap-2.5 rounded-card bg-canvas/95 px-3 py-2.5 shadow-window ${className}`}
    >
      {children}
      {done && (
        <span className="absolute -end-1.5 -top-1.5 grid size-5 animate-stamp place-items-center rounded-full bg-sage-ink text-canvas">
          <CheckIcon size={11} strokeWidth={2.8} />
        </span>
      )}
    </li>
  );
}

function Row({ on, className = "", children }: { on: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`transition-all duration-500 ease-out ${on ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"} ${className}`}>
      {children}
    </div>
  );
}

function Fact({ on, struck = false, claim, children }: { on: boolean; struck?: boolean; claim: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-1.5 px-3 py-2.5">
      <span
        className={`text-utility transition-colors duration-500 ${struck ? "text-quiet line-through" : on ? "text-graphite" : "text-quiet"}`}
      >
        {claim}
      </span>
      <span className="flex h-[22px] items-center">{on && children}</span>
    </li>
  );
}

function Chip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`flex w-fit animate-stamp items-center gap-1 rounded-badge px-1.5 py-0.5 text-utility font-medium ${className}`}>
      {children}
    </span>
  );
}
