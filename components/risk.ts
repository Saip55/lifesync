import type { RiskLevel } from "@/lib/schema";

// Every risk colour ships with a text label so meaning never depends on colour alone.
export const RISK_STYLES: Record<RiskLevel, { label: string; text: string; soft: string; bar: string }> = {
  critical: { label: "Critical risk", text: "text-critical", soft: "bg-critical-soft", bar: "border-critical" },
  high: { label: "High risk", text: "text-high", soft: "bg-high-soft", bar: "border-high" },
  moderate: { label: "Moderate risk", text: "text-moderate", soft: "bg-moderate-soft", bar: "border-moderate" },
  low: { label: "Low risk", text: "text-low", soft: "bg-low-soft", bar: "border-low" },
  info: { label: "For your information", text: "text-info", soft: "bg-info-soft", bar: "border-info" },
};
