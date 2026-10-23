import type { SiteLanguageCode } from "@/lib/languages";
import { en } from "./en";

export type Dict = typeof en;

export { en };

// English ships with the page. Every other language is its own chunk, fetched only when chosen,
// so a visitor downloads one dictionary instead of six.
const LOADERS: Record<Exclude<SiteLanguageCode, "en">, () => Promise<Dict>> = {
  hi: () => import("./hi").then((m) => m.hi),
  bn: () => import("./bn").then((m) => m.bn),
  mr: () => import("./mr").then((m) => m.mr),
  te: () => import("./te").then((m) => m.te),
  ta: () => import("./ta").then((m) => m.ta),
};

export function loadDictionary(code: SiteLanguageCode): Promise<Dict> {
  return code === "en" ? Promise.resolve(en) : LOADERS[code]();
}

// Replaces {name} placeholders. Unknown keys are left as they are so a gap is visible, not silent.
export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export const LANG_STORAGE_KEY = "lifesync-lang";
