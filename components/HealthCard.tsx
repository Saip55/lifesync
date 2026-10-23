"use client";

import { useEffect, useState } from "react";
import type { HealthCard as HealthCardData } from "@/lib/schema";
import { AlertIcon, PrinterIcon } from "./Icons";
import { useLanguage } from "./LanguageProvider";

// Compact plain-text summary for the QR code (kept under ~700 characters).
function qrText(card: HealthCardData) {
  const lines = [
    `LifeSync health card`,
    `${card.name}, ${card.age}, blood ${card.blood_group}`,
    `Conditions: ${card.conditions.join("; ") || "-"}`,
    `Medicines: ${card.medicines.map((m) => `${m.name} ${m.dose} ${m.frequency}`).join("; ") || "-"}`,
    `Allergies: ${card.allergies.join("; ") || "-"}`,
    `Warnings: ${card.warnings.join("; ") || "-"}`,
    `AI-generated. Confirm with a doctor.`,
  ];
  return lines.join("\n").slice(0, 700);
}

// One term and its value. The wrapper div is the only element allowed between <dl> and <dt>/<dd>.
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-utility font-medium uppercase tracking-[0.06em] text-quiet">{label}</dt>
      <dd className="mt-1 text-caption text-graphite">{children}</dd>
    </div>
  );
}

export function HealthCard({ card }: { card: HealthCardData }) {
  const [qr, setQr] = useState<string | null>(null);
  const h = useLanguage().t.health;

  // The QR library is loaded only when a card actually has health details.
  useEffect(() => {
    let current = true;
    import("qrcode")
      .then(({ toDataURL }) => toDataURL(qrText(card), { margin: 1, width: 280, color: { dark: "#2e2e2e", light: "#fdfcfb" } }))
      .then((url) => current && setQr(url))
      .catch(() => current && setQr(null));
    return () => {
      current = false;
    };
  }, [card]);

  return (
    <section aria-labelledby="health-card-title" className="print-area rounded-card border border-linen bg-canvas">
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
        <div>
          <p className="text-utility font-medium uppercase tracking-[0.06em] text-quiet">{h.title}</p>
          <h3 id="health-card-title" className="font-display text-card font-medium tracking-[-0.01em]">
            {card.name || h.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print flex h-9 items-center gap-1.5 rounded-badge border border-tool-border ps-3 pe-2.5 text-caption text-graphite transition-colors hover:bg-cloud"
        >
          <PrinterIcon size={16} />
          {h.print}
        </button>
      </header>

      <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto]">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label={h.age}>{card.age || "—"}</Field>
          <Field label={h.blood}>{card.blood_group || "—"}</Field>
          <Field label={h.conditions} wide>
            {card.conditions.join(", ") || h.none}
          </Field>
          <div className="col-span-2">
            <dt className="text-utility font-medium uppercase tracking-[0.06em] text-quiet">{h.medicines}</dt>
            <dd className="mt-1.5">
              <table className="w-full text-caption">
                <thead className="sr-only">
                  <tr>
                    <th scope="col">{h.medicines}</th>
                    <th scope="col">{h.dose}</th>
                    <th scope="col">{h.frequency}</th>
                  </tr>
                </thead>
                <tbody>
                  {card.medicines.map((m, i) => (
                    <tr key={i} className="border-t border-hairline first:border-t-0">
                      <th scope="row" className="py-1.5 pe-3 text-start font-medium text-graphite">
                        {m.name}
                      </th>
                      <td className="py-1.5 pe-3 font-mono text-[0.8125rem] text-charcoal">{m.dose}</td>
                      <td className="py-1.5 text-quiet">{m.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </dd>
          </div>
          <Field label={h.allergies} wide>
            {card.allergies.join(", ") || h.none}
          </Field>
        </dl>

        <div className="flex flex-col items-center gap-2 sm:w-36">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise
            <img src={qr} alt={h.qrAlt} width={144} height={144} className="rounded-badge" />
          ) : (
            <div className="size-36 animate-breathe rounded-badge bg-board" aria-hidden="true" />
          )}
          <p className="text-center text-utility text-quiet">{h.scan}</p>
        </div>
      </div>

      {card.warnings.length > 0 && (
        <ul className="mx-5 mb-5 space-y-1.5 rounded-feature bg-high-soft p-4">
          {card.warnings.map((w, i) => (
            <li key={i} className="flex gap-2 text-caption text-graphite">
              <AlertIcon size={16} className="mt-0.5 shrink-0 text-high" />
              {w}
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-hairline px-5 py-3 text-utility text-quiet">
        {h.footer}
      </p>
    </section>
  );
}
