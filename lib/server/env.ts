import "server-only";
import { z } from "zod";

// Server configuration, validated in one place. Read on every call (not cached) so a changed
// deployment variable or a test's stubbed value is always picked up.

export const DEFAULT_MODEL = "gemini-3.8-flash";

const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1).optional().catch(undefined),
  // Model names are short slugs; anything else is a typo, so fall back rather than send it.
  GEMINI_MODEL: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9.-]{1,63}$/)
    .catch(DEFAULT_MODEL)
    .default(DEFAULT_MODEL),
  GOOGLE_MAPS_KEY: z.string().trim().min(1).optional().catch(undefined),
});

export type Env = z.infer<typeof EnvSchema>;

const blankToUndefined = (v: string | undefined) => (v?.trim() ? v : undefined);

export function env(): Env {
  return EnvSchema.parse({
    GEMINI_API_KEY: blankToUndefined(process.env.GEMINI_API_KEY),
    GEMINI_MODEL: blankToUndefined(process.env.GEMINI_MODEL),
    GOOGLE_MAPS_KEY: blankToUndefined(process.env.GOOGLE_MAPS_KEY),
  });
}
