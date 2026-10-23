import { z } from "zod";

// The action card is the contract between Gemini, the API route and the UI.

export const CATEGORIES = ["medical", "disaster", "traffic", "misinformation", "civic", "other"] as const;
export const RISK_LEVELS = ["critical", "high", "moderate", "low", "info"] as const;
export const FACT_STATUSES = ["verified", "unverified", "contradicted"] as const;
export const URGENCIES = ["now", "today", "this_week"] as const;
export const ACTION_TYPES = ["call", "message", "reminder", "navigate", "info"] as const;
export const VERDICTS = ["true", "false", "misleading", "unverifiable"] as const;

export const FactSchema = z.object({
  claim: z.string(),
  source: z.string(),
  status: z.enum(FACT_STATUSES),
});

export const ActionSchema = z.object({
  title: z.string(),
  detail: z.string(),
  urgency: z.enum(URGENCIES),
  type: z.enum(ACTION_TYPES),
  payload: z
    .object({
      phone: z.string().optional(),
      message: z.string().optional(),
      time_iso: z.string().optional(),
      destination: z.string().optional(),
    })
    .default({}),
  needs_confirmation: z.boolean(),
});

export const ContactSchema = z.object({
  name: z.string(),
  number: z.string(),
  why: z.string(),
});

export const HealthCardSchema = z.object({
  name: z.string(),
  age: z.string(),
  blood_group: z.string(),
  conditions: z.array(z.string()),
  medicines: z.array(z.object({ name: z.string(), dose: z.string(), frequency: z.string() })),
  allergies: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const RumorVerdictSchema = z.object({
  verdict: z.enum(VERDICTS),
  correction: z.string(),
});

export const ActionCardSchema = z.object({
  situation: z.string(),
  language_code: z.string(),
  category: z.enum(CATEGORIES),
  risk_level: z.enum(RISK_LEVELS),
  risk_reason: z.string(),
  verified_facts: z.array(FactSchema),
  actions: z.array(ActionSchema),
  contacts: z.array(ContactSchema),
  health_card: HealthCardSchema.nullable(),
  rumor_verdict: RumorVerdictSchema.nullable(),
  confidence: z.number().min(0).max(100),
  couldnt_verify: z.array(z.string()),
  critic_notes: z.array(z.string()),
  spoken_summary: z.string(),
});

export type RiskLevel = (typeof RISK_LEVELS)[number];
export type Fact = z.infer<typeof FactSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type HealthCard = z.infer<typeof HealthCardSchema>;
export type RumorVerdict = z.infer<typeof RumorVerdictSchema>;
export type ActionCard = z.infer<typeof ActionCardSchema>;

// What the API returns alongside the card.
export type Source = { title: string; url: string };
export type AnalyzeResult = {
  card: ActionCard;
  verified: boolean;
  sources: Source[];
  signals: { label: string; value: string }[];
};
