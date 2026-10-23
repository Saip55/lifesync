import type { Dict } from "@/lib/i18n";
import type { AnalyzeResult } from "@/lib/schema";

/** The card as plain text, to send to family or show a doctor. Section names are in the site language. */
export function planText({ card, verified }: AnalyzeResult, t: Dict["card"]): string {
  const section = (title: string, items: string[]) => (items.length ? [title, ...items, ""] : []);
  return [
    `${t.risk[card.risk_level]}: ${card.situation}`,
    "",
    ...section(
      t.doNow,
      card.actions.map((a, i) => `${i + 1}. ${a.title}${a.payload.phone ? ` (${a.payload.phone})` : ""}${a.detail ? ` — ${a.detail}` : ""}`)
    ),
    ...section(
      t.contacts,
      card.contacts.map((c) => `• ${c.name}: ${c.number}`)
    ),
    ...section(
      t.couldnt,
      card.couldnt_verify.map((x) => `• ${x}`)
    ),
    `${t.confidence}: ${card.confidence}% · ${verified ? t.factChecked : t.notVerified}`,
    t.shareFooter,
  ].join("\n");
}
