"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-utility font-medium uppercase tracking-[0.06em] text-quiet">{label}</dt>
      <dd className="mt-1 text-caption text-graphite">{children}</dd>
    </div>
  );
}

export function HealthCard({ card }: { card: HealthCardData }) {
  const [qr, setQr] = useState<string | null>(null);
  const h = useLanguage().t.health;

  useEffect(() => {
    QRCode.toDataURL(qrText(card), { margin: 1, width: 280, color: { dark: "#2e2e2e", light: "#fdfcfb" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [card]);

  return (
    <section aria-labelledby="health-card-title" className="print-area rounded-card border border-linen bg-canvas">
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
        <div>
          <p className="text-utility font-medium uppercase tracking-[0.06em] text-quiet">{h.title}</p>
          <h3 id="health-card-title" className="font-display text-card font-medium tracking-[-0.01em]">
            {card.name}
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
          <Field label={h.age}>{card.age}</Field>
          <Field label={h.blood}>{card.blood_group}</Field>
          <div className="col-span-2">
            <Field label={h.conditions}>{card.conditions.join(", ") || h.none}</Field>
          </div>
          <div className="col-span-2">
            <dt className="text-utility font-medium uppercase tracking-[0.06em] text-quiet">{h.medicines}</dt>
            <dd className="mt-1.5">
              <table className="w-full text-caption">
                <tbody>
                  {card.medicines.map((m, i) => (
                    <tr key={i} className="border-t border-hairline first:border-t-0">
                      <td className="py-1.5 pe-3 font-medium text-graphite">{m.name}</td>
                      <td className="py-1.5 pe-3 font-mono text-[13px] text-charcoal">{m.dose}</td>
                      <td className="py-1.5 text-quiet">{m.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </dd>
          </div>
          <div className="col-span-2">
            <Field label={h.allergies}>{card.allergies.join(", ") || h.none}</Field>
          </div>
        </dl>

        <div className="flex flex-col items-center gap-2 sm:w-36">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise
            <img src={qr} alt={h.qrAlt} width={144} height={144} className="rounded-badge" />
          ) : (
            <div className="size-36 rounded-badge bg-board" />
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
