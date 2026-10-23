"use client";

import { useId, useState, type ReactNode } from "react";
import type { AnalyzeResult, Fact } from "@/lib/schema";
import { telHref } from "@/lib/client/actions";
import { planText } from "@/lib/client/summary";
import { RISK_STYLES } from "./risk";
import { ActionButton } from "./ActionButton";
import { HealthCard } from "./HealthCard";
import { ReadAloud } from "./ReadAloud";
import { useLanguage } from "./LanguageProvider";
import { AlertIcon, CheckIcon, ChevronDownIcon, CopyIcon, ExternalIcon, MessageIcon, PhoneIcon, QuestionIcon, ShieldIcon, XIcon } from "./Icons";

const FACT_CHIP: Record<Fact["status"], { className: string; Icon: typeof CheckIcon }> = {
  verified: { className: "bg-low-soft text-low", Icon: CheckIcon },
  unverified: { className: "bg-cloud text-quiet", Icon: QuestionIcon },
  contradicted: { className: "bg-critical-soft text-critical", Icon: XIcon },
};

function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-caption font-semibold text-graphite">{children}</h3>;
}

type Notice = "" | "correction" | "plan";

export function ActionCard({ result }: { result: AnalyzeResult }) {
  const { card, verified, sources, signals } = result;
  const risk = RISK_STYLES[card.risk_level];
  const [notice, setNotice] = useState<Notice>("");
  const c = useLanguage().t.card;
  const confidenceId = useId();

  const flash = (what: Notice) => {
    setNotice(what);
    window.setTimeout(() => setNotice(""), 2500);
  };

  // The clipboard can be blocked (permissions, insecure context); then there is simply no "copied" note.
  const copy = async (text: string, what: Notice) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(what);
    } catch {
      // Nothing to undo.
    }
  };

  // The phone's share sheet where there is one (WhatsApp, SMS, email); otherwise the clipboard.
  const share = async () => {
    const text = planText(result, c);
    if ("share" in navigator) {
      try {
        await navigator.share({ title: "LifeSync", text });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    await copy(text, "plan");
  };

  return (
    <article lang={card.language_code} className="animate-rise space-y-6" aria-label={c.aria}>
      <p role="status" className="sr-only">
        {notice === "plan" ? c.shareCopied : notice === "correction" ? c.copied : ""}
      </p>

      {/* Risk banner */}
      <div className={`rounded-card border-s-4 ${risk.bar} ${risk.soft} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`flex items-center gap-2 text-body font-semibold ${risk.text}`}>
            <AlertIcon size={18} />
            {c.risk[card.risk_level]}
          </p>
          <span className="rounded-badge border border-black/10 bg-canvas/70 px-2 py-0.5 text-utility font-medium text-charcoal">
            {c.category[card.category]}
          </span>
        </div>
        <p className="mt-1.5 text-caption text-charcoal">{card.risk_reason}</p>
        {card.risk_level === "critical" && (
          <a
            href={telHref("112")}
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-critical text-body font-semibold text-white transition-opacity hover:opacity-90"
          >
            <PhoneIcon size={18} />
            {c.call112}
          </a>
        )}
      </div>

      {/* Summary + confidence */}
      <div>
        <p className="text-card leading-snug font-medium text-graphite">{card.situation}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex min-w-48 flex-1 items-center gap-3">
            <span className="text-caption text-quiet" id={confidenceId}>
              {c.confidence}
            </span>
            <span
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.07]"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={card.confidence}
              aria-valuetext={`${card.confidence}%`}
              aria-labelledby={confidenceId}
            >
              <span className="block h-full rounded-full bg-graphite" style={{ width: `${card.confidence}%` }} />
            </span>
            <span className="font-mono text-[0.8125rem] text-graphite" aria-hidden="true">
              {card.confidence}%
            </span>
          </div>
          {verified ? (
            <span className="flex items-center gap-1.5 text-caption font-medium text-low">
              <ShieldIcon size={16} /> {c.factChecked}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-caption font-medium text-high">
              <AlertIcon size={16} /> {c.notVerified}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <ReadAloud text={card.spoken_summary} lang={card.language_code} />
          <button
            type="button"
            onClick={() => void share()}
            className="flex h-10 items-center gap-1.5 rounded-full px-3 text-caption font-medium text-charcoal transition-colors hover:bg-cloud"
          >
            {notice === "plan" ? <CheckIcon size={16} /> : <MessageIcon size={16} />}
            {notice === "plan" ? c.shareCopied : c.share}
          </button>
        </div>
      </div>

      {/* Rumour verdict */}
      {card.rumor_verdict && (
        <section className="rounded-card border border-hairline bg-canvas p-5" aria-labelledby="verdict-title">
          <h3 id="verdict-title" className="text-utility font-medium tracking-[0.06em] text-quiet uppercase">
            {c.verdictTitle}
          </h3>
          <p
            className={`mt-1 font-display text-section font-medium ${
              card.rumor_verdict.verdict === "true" ? "text-low" : card.rumor_verdict.verdict === "unverifiable" ? "text-quiet" : "text-critical"
            }`}
          >
            {c.verdicts[card.rumor_verdict.verdict]}
          </p>
          <p className="mt-2 text-body text-charcoal">{card.rumor_verdict.correction}</p>
          <button
            type="button"
            onClick={() => void copy(card.rumor_verdict?.correction ?? "", "correction")}
            className="mt-4 flex h-11 items-center gap-2 rounded-full bg-graphite px-5 text-caption font-semibold text-canvas transition-colors hover:bg-graphite-hover"
          >
            {notice === "correction" ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
            {notice === "correction" ? c.copied : c.copy}
          </button>
        </section>
      )}

      {/* Actions */}
      {card.actions.length > 0 && (
        <section>
          <SectionLabel>{c.doNow}</SectionLabel>
          <ol className="space-y-2">
            {card.actions.map((a, i) => (
              <ActionButton key={i} action={a} index={i} />
            ))}
          </ol>
        </section>
      )}

      {/* Facts + contacts */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {card.verified_facts.length > 0 && (
          <section>
            <SectionLabel>{c.checked}</SectionLabel>
            <ul className="divide-y divide-hairline rounded-card border border-hairline bg-canvas">
              {card.verified_facts.map((f, i) => {
                const chip = FACT_CHIP[f.status];
                return (
                  <li key={i} className="p-4">
                    <span className={`inline-flex items-center gap-1 rounded-badge px-1.5 py-0.5 text-utility font-medium ${chip.className}`}>
                      <chip.Icon size={12} strokeWidth={2.2} />
                      {c.facts[f.status]}
                    </span>
                    <p className="mt-2 text-caption text-graphite">{f.claim}</p>
                    <p className="mt-1 text-utility text-quiet">
                      {c.source}: {f.source}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {card.contacts.length > 0 && (
          <section>
            <SectionLabel>{c.contacts}</SectionLabel>
            <ul className="space-y-2">
              {card.contacts.map((ct, i) => (
                <li key={i}>
                  <a
                    href={telHref(ct.number)}
                    className="flex items-center justify-between gap-3 rounded-card border border-hairline bg-canvas p-4 transition-colors hover:bg-cloud"
                  >
                    <span className="min-w-0">
                      <span className="block text-caption font-semibold text-graphite">{ct.name}</span>
                      <span className="block text-utility text-quiet">{ct.why}</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[0.9375rem] font-medium text-graphite" dir="ltr">
                      <PhoneIcon size={15} />
                      {ct.number}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Could not verify */}
      {card.couldnt_verify.length > 0 && (
        <section className="rounded-feature bg-paper px-[17px] py-4">
          <h3 className="flex items-center gap-2 text-caption font-semibold text-graphite">
            <QuestionIcon size={16} /> {c.couldnt}
          </h3>
          <ul className="mt-2 space-y-1.5 ps-6">
            {card.couldnt_verify.map((item, i) => (
              <li key={i} className="list-disc text-caption text-charcoal marker:text-ash">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {card.health_card && <HealthCard card={card.health_card} />}

      {/* Sources and signals */}
      <details className="group rounded-card border border-hairline bg-canvas">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 p-4 text-caption font-semibold text-graphite">
          {c.signals}
          <ChevronDownIcon size={16} className="text-quiet transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-5 border-t border-hairline p-4">
          {signals.length > 0 && (
            <dl className="grid gap-2 sm:grid-cols-[120px_1fr]">
              {signals.map((s) => (
                <div key={s.key} className="contents">
                  <dt className="text-utility font-medium text-quiet">{c.signalLabels[s.key]}</dt>
                  <dd className="text-caption text-graphite" lang="en">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {sources.length > 0 && (
            <ul className="space-y-1.5">
              {sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-caption font-medium text-research underline-offset-2 hover:underline"
                  >
                    {s.title}
                    <ExternalIcon size={13} />
                    <span className="sr-only">{c.newTab}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {card.critic_notes.length > 0 && (
            <div>
              <p className="text-utility font-medium text-quiet">{c.notes}</p>
              <ul className="mt-1 space-y-1" lang="en">
                {card.critic_notes.map((n, i) => (
                  <li key={i} className="font-mono text-[0.8125rem] leading-[1.6] text-charcoal">
                    — {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </article>
  );
}
