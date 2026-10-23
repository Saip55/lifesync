import type { RiskLevel } from "@/lib/schema";

// Colours for each risk level. The card always pairs them with a translated text label and an icon,
// so meaning never depends on colour alone.
export const RISK_STYLES: Record<RiskLevel, { text: string; soft: string; bar: string }> = {
  critical: { text: "text-critical", soft: "bg-critical-soft", bar: "border-critical" },
  high: { text: "text-high", soft: "bg-high-soft", bar: "border-high" },
  moderate: { text: "text-moderate", soft: "bg-moderate-soft", bar: "border-moderate" },
  low: { text: "text-low", soft: "bg-low-soft", bar: "border-low" },
  info: { text: "text-info", soft: "bg-info-soft", bar: "border-info" },
};
