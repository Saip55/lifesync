"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { RiskLevel } from "@/lib/schema";
import type { Scenario } from "@/lib/scenarios";
import { RISK_STYLES } from "../risk";
import { useLanguage } from "../LanguageProvider";
import { AlertIcon, ArrowRightIcon, CarIcon, CheckIcon, CloudRainIcon, MessageIcon, ShieldIcon, FileIcon } from "../Icons";
import { Reveal } from "./Reveal";

// Static facts about each case; the words come from the dictionary in the same order.
type CaseMeta = { Icon: typeof CarIcon; risk: RiskLevel; example: Scenario["id"] | null };
// Each case keeps its own landscape tint so the list reads at a glance.
const TINTS = ["bg-peach text-peach-ink", "bg-sky text-sky-ink", "bg-lilac text-lilac-ink", "bg-critical-soft text-critical"];

const CASES: [CaseMeta, ...CaseMeta[]] = [
  { Icon: FileIcon, risk: "high", example: "medical" },
  { Icon: CloudRainIcon, risk: "high", example: "flood" },
  { Icon: MessageIcon, risk: "low", example: "rumour" },
  { Icon: CarIcon, risk: "critical", example: null },
];

const CYCLE_MS = 7000;

export function UseCases() {
  const c = useLanguage().t.cases;
  const [active, setActive] = useState(0);
  // Auto-advance only when motion is welcome; otherwise the tabs simply wait for a click.
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- media query is only readable in the browser
    setAuto(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const item = c.items[active] ?? (c.items[0] as (typeof c.items)[number]);
  const meta = CASES[active] ?? CASES[0];
  const risk = RISK_STYLES[meta.risk];

  return (
    // Hovering or focusing anywhere in the section pauses the auto-advance (pure CSS, see the progress line).
    <div className="group/cases grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
      <Reveal>
        <p className="text-[0.8125rem] font-semibold tracking-[0.08em] text-sage-ink uppercase">{c.eyebrow}</p>
        <h2 className="mt-3 max-w-[560px] font-display text-[2rem] leading-[1.12] font-medium tracking-[-0.03em] text-graphite sm:text-[2.625rem]">
          {c.title}
        </h2>
        <p className="mt-4 max-w-[520px] text-lead leading-[1.75rem] text-charcoal">{c.body}</p>

        <div role="tablist" aria-label={c.eyebrow} className="mt-10 border-t border-hairline">
          {c.items.map((it, i) => {
            const on = i === active;
            const { Icon } = CASES[i] ?? CASES[0];
            return (
              <button
                key={it.label}
                type="button"
                role="tab"
                id={`case-tab-${i}`}
                aria-selected={on}
                aria-controls="case-panel"
                onClick={() => setActive(i)}
                className="group relative flex w-full items-center gap-4 border-b border-hairline py-4 text-start"
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-300 ${
                    on ? `${TINTS[i]} scale-110` : "bg-cloud text-quiet group-hover:text-graphite"
                  }`}
                >
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-body font-semibold transition-colors duration-300 ${on ? "text-graphite" : "text-quiet group-hover:text-graphite"}`}
                  >
                    {it.label}
                  </span>
                  <span className="block text-utility text-quiet">{it.kind}</span>
                </span>
                <span className="font-mono text-[0.75rem] text-quiet tabular-nums">0{i + 1}</span>
                {/* Progress line: when it finishes, the next case opens. */}
                {on && (
                  <span className="absolute inset-x-0 -bottom-px h-px overflow-hidden bg-transparent" aria-hidden="true">
                    {auto ? (
                      <span
                        key={active}
                        className="block h-full origin-left animate-progress bg-graphite group-focus-within/cases:[animation-play-state:paused] group-hover/cases:[animation-play-state:paused] rtl:origin-right"
                        style={{ "--progress-ms": `${CYCLE_MS}ms` } as CSSProperties}
                        onAnimationEnd={() => setActive((n) => (n + 1) % c.items.length)}
                      />
                    ) : (
                      <span className="block h-full bg-graphite" />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div
          id="case-panel"
          role="tabpanel"
          aria-labelledby={`case-tab-${active}`}
          className="relative isolate overflow-hidden rounded-[24px] border border-hairline bg-[linear-gradient(160deg,#f7f6f2_0%,#f1eee6_100%)] p-4 sm:p-7"
        >
          <span aria-hidden="true" className="absolute -end-24 -top-24 -z-10 size-72 rounded-full bg-sun/15 blur-3xl" />
          <span aria-hidden="true" className="absolute -start-24 bottom-0 -z-10 size-64 rounded-full bg-sage-ink/10 blur-3xl" />

          {/* key re-runs the entrance for each case */}
          <div key={active} className="space-y-3">
            <div className="animate-rise rounded-card bg-canvas/80 p-5 shadow-seg backdrop-blur">
              <p className="text-utility font-semibold tracking-[0.06em] text-quiet uppercase">{c.youShare}</p>
              <p className="mt-3 font-display text-[1.1875rem] leading-[1.45] tracking-[-0.01em] text-graphite sm:text-[1.3125rem]">
                “{item.input}”
              </p>
              <p className="mt-3 text-utility text-quiet">{item.kind}</p>
            </div>

            <div className="flex justify-center" aria-hidden="true">
              <span className="h-6 w-px bg-gradient-to-b from-linen to-graphite/40" />
            </div>

            <div className="animate-rise rounded-card bg-canvas p-5 shadow-overlay" style={{ animationDelay: "140ms" }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-utility font-semibold tracking-[0.06em] text-quiet uppercase">{c.youGet}</p>
                <span className="flex items-center gap-1 rounded-badge bg-sage px-2 py-0.5 text-utility font-medium text-sage-ink">
                  <ShieldIcon size={12} /> {c.checked}
                </span>
              </div>

              <p className={`mt-4 flex items-center gap-2 rounded-feature border-s-[3px] px-3 py-2 text-caption font-semibold ${risk.bar} ${risk.soft} ${risk.text}`}>
                <AlertIcon size={15} />
                {item.risk}
              </p>

              <div className="mt-4 flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-graphite text-[0.75rem] font-semibold text-canvas">1</span>
                <div>
                  <p className="text-utility font-medium text-quiet">{c.firstStep}</p>
                  <p className="mt-0.5 text-body font-medium text-graphite">{item.step}</p>
                </div>
              </div>

              <p className="mt-4 flex items-start gap-2 border-t border-hairline pt-4 text-caption text-charcoal">
                <CheckIcon size={15} className="mt-0.5 shrink-0 text-sage-ink" strokeWidth={2.4} />
                {item.fact}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Link
                href={meta.example ? `/try?example=${meta.example}` : "/try"}
                className="group inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-caption font-semibold text-graphite transition-colors hover:bg-canvas/70"
              >
                {c.tryIt}
                <ArrowRightIcon size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100" />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
