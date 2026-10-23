import "server-only";
import { getLanguage, LANGUAGES } from "@/lib/languages";

// Vercel caps request bodies at 4.5 MB; leave headroom for form encoding.
export const MAX_BODY_BYTES = 4_400_000;
const MAX_FILES = 6;
const MAX_TEXT = 8_000;

const FILE_TYPES = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf|text\/plain)$/;
const AUDIO_TYPES = /^audio\/(webm|ogg|mp4|mpeg|wav|aac|x-m4a)$/;

export type Blob64 = { name: string; mimeType: string; data: string };

export type AnalyzeInput = {
  text: string;
  audio: Blob64 | null;
  files: Blob64[];
  docs: { name: string; text: string }[];
  lat: number | null;
  lon: number | null;
  replyLanguage: string | null;
};

export class InputError extends Error {
  constructor(
    readonly code: "no_input" | "too_large" | "bad_file",
    message: string
  ) {
    super(message);
  }
}

const baseType = (t: string) => t.split(";")[0]?.trim().toLowerCase() ?? "";

const num = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

async function toBase64(f: File): Promise<Blob64> {
  return { name: f.name, mimeType: baseType(f.type), data: Buffer.from(await f.arrayBuffer()).toString("base64") };
}

export async function parseForm(form: FormData): Promise<AnalyzeInput> {
  const text = String(form.get("text") ?? "").slice(0, MAX_TEXT).trim();
  const uploads = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const audioEntry = form.get("audio");
  const audio = audioEntry instanceof File && audioEntry.size > 0 ? audioEntry : null;

  if (!text && uploads.length === 0 && !audio) throw new InputError("no_input", "Add a few words, a photo, or a voice note first.");
  if (uploads.length > MAX_FILES) throw new InputError("too_large", `Attach up to ${MAX_FILES} files at a time.`);
  const total = uploads.reduce((n, f) => n + f.size, 0) + (audio?.size ?? 0);
  if (total > MAX_BODY_BYTES) throw new InputError("too_large", "Those files are too large together. Try fewer photos or a smaller PDF (4 MB total).");

  for (const f of uploads) {
    if (!FILE_TYPES.test(baseType(f.type))) throw new InputError("bad_file", `${f.name} isn’t supported. Use photos, PDFs or plain text.`);
  }
  if (audio && !AUDIO_TYPES.test(baseType(audio.type))) throw new InputError("bad_file", "That voice note format isn’t supported. Try recording again.");

  const docs = await Promise.all(uploads.filter((f) => baseType(f.type) === "text/plain").map(async (f) => ({ name: f.name, text: (await f.text()).slice(0, MAX_TEXT) })));
  const files = await Promise.all(uploads.filter((f) => baseType(f.type) !== "text/plain").map(toBase64));

  const reply = String(form.get("replyLang") ?? "");
  const known = LANGUAGES.some((l) => l.code === reply);

  return {
    text,
    audio: audio ? await toBase64(audio) : null,
    files,
    docs,
    lat: num(form.get("lat"), -90, 90),
    lon: num(form.get("lon"), -180, 180),
    replyLanguage: known ? getLanguage(reply).english : null,
  };
}
