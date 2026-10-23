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

// What the API returns alongside the card. Signal keys are labelled in the UI language.
export const SIGNAL_KEYS = ["weather", "news", "traffic", "language", "inputs", "timing"] as const;
export type SignalKey = (typeof SIGNAL_KEYS)[number];
export type Signal = { key: SignalKey; value: string };
export type Source = { title: string; url: string };
export type AnalyzeResult = {
  card: ActionCard;
  verified: boolean;
  sources: Source[];
  signals: Signal[];
};

// What each Gemini call must return. Plan adds hints for live data the critic needs;
// the critic also lists its own sources in case grounding metadata comes back empty.
export const PlanOutputSchema = z.object({
  card: ActionCardSchema,
  news_query: z.string(),
  destination_query: z.string().nullable(),
});
export type PlanOutput = z.infer<typeof PlanOutputSchema>;

export const CriticOutputSchema = z.object({
  card: ActionCardSchema,
  sources: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
});

// Newline-delimited JSON events streamed by POST /api/analyze.
// Stages: 0 understanding, 1 live data, 2 planning, 3 fact-checking.
export type Stage = 0 | 1 | 2 | 3;
export const ERROR_CODES = ["no_input", "too_large", "bad_file", "not_configured", "timeout", "model", "rate_limited", "forbidden"] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export type StreamEvent =
  | { type: "stage"; stage: Stage }
  | { type: "result"; result: AnalyzeResult }
  | { type: "error"; code: ErrorCode; message: string };
