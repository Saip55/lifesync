import type { SiteLanguageCode } from "@/lib/languages";
import { en } from "./en";
import { hi } from "./hi";
import { bn } from "./bn";
import { mr } from "./mr";
import { te } from "./te";
import { ta } from "./ta";

export type Dict = typeof en;

export const DICTIONARIES: Record<SiteLanguageCode, Dict> = { en, hi, bn, mr, te, ta };

// Replaces {name} placeholders. Unknown keys are left as they are so a gap is visible, not silent.
export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export const LANG_STORAGE_KEY = "lifesync-lang";
