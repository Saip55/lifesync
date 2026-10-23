"use client";

import Link from "next/link";
import { useLanguage } from "../LanguageProvider";
import { AlertIcon, PhoneIcon } from "../Icons";

// Shared body for the error and not-found pages: a plain explanation, a way forward, and 112.
export function ProblemPage({ kind, onRetry }: { kind: "error" | "notFound"; onRetry?: () => void }) {
  const { t } = useLanguage();
  const copy = kind === "error" ? t.errorPage : t.notFound;

  return (
    <main id="main" tabIndex={-1} className="mx-auto grid min-h-[70dvh] max-w-xl place-items-center px-4 py-16 text-center outline-none">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-high-soft text-high">
          <AlertIcon size={20} />
        </span>
        <h1 className="mt-5 font-display text-[2rem] leading-tight font-medium tracking-[-0.03em] text-graphite">{copy.title}</h1>
        <p className="mt-3 text-body text-charcoal">{copy.body}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="h-11 rounded-full bg-graphite px-5 text-caption font-semibold text-canvas transition-colors hover:bg-graphite-hover"
            >
              {t.errorPage.retry}
            </button>
          )}
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border border-tool-border px-5 text-caption font-medium text-graphite transition-colors hover:bg-cloud"
          >
            {copy.home}
          </Link>
          <a
            href="tel:112"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-critical px-5 text-caption font-semibold text-white transition-opacity hover:opacity-90"
          >
            <PhoneIcon size={15} />
            {t.tryPage.callNow}
          </a>
        </div>
      </div>
    </main>
  );
}
