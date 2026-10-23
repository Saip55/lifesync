import "server-only";
import { getLanguage, LANGUAGES } from "@/lib/languages";
import type { ErrorCode } from "@/lib/schema";
import { AUDIO, IMAGE_OR_PDF, readPlainText, sniffType, type SniffedType } from "./sniff";

// Vercel caps request bodies at 4.5 MB; leave headroom for form encoding.
export const MAX_BODY_BYTES = 4_400_000;
const MAX_FORM_BYTES = MAX_BODY_BYTES + 200_000;
const MAX_FILES = 6;
const MAX_TEXT = 8_000;
const MAX_NAME = 80;

export type Blob64 = { name: string; mimeType: SniffedType; data: string };

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
    readonly code: Extract<ErrorCode, "no_input" | "too_large" | "bad_file">,
    message: string
  ) {
    super(message);
    this.name = "InputError";
  }
}

const tooLarge = () => new InputError("too_large", "That’s too much to send at once. Try fewer or smaller files (4 MB total).");
const unreadable = () => new InputError("bad_file", "That request couldn’t be read. Please try again.");

/** Buffers at most MAX_FORM_BYTES of a multipart body, so an oversized upload is refused as it streams in. */
export async function readForm(req: Request): Promise<FormData> {
  const type = req.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;/i.test(type)) throw unreadable();
  if (Number(req.headers.get("content-length") ?? 0) > MAX_FORM_BYTES) throw tooLarge();

  const chunks: Uint8Array[] = [];
  let size = 0;
  if (req.body) {
    const reader = req.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FORM_BYTES) {
        await reader.cancel();
        throw tooLarge();
      }
      chunks.push(value);
    }
  }
  try {
    return await new Response(Buffer.concat(chunks), { headers: { "content-type": type } }).formData();
  } catch {
    throw unreadable();
  }
}

const isFile = (v: FormDataEntryValue | null): v is File => v instanceof File && v.size > 0;

// File names reach the prompt, so keep them short and free of control and markup characters.
const safeName = (name: string) => name.replace(/[\u0000-\u001f\u007f<>"`]/g, "").trim().slice(0, MAX_NAME) || "file";

const num = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

const isOneOf = <T extends string>(list: readonly T[], v: string | null): v is T => v !== null && (list as readonly string[]).includes(v);

export async function parseForm(form: FormData): Promise<AnalyzeInput> {
  const text = String(form.get("text") ?? "").trim().slice(0, MAX_TEXT);
  const uploads = form.getAll("files").filter(isFile);
  const audioEntry = form.get("audio");
  const audio = isFile(audioEntry) ? audioEntry : null;

  if (!text && uploads.length === 0 && !audio) throw new InputError("no_input", "Add a few words, a photo, or a voice note first.");
  if (uploads.length > MAX_FILES) throw new InputError("too_large", `Attach up to ${MAX_FILES} files at a time.`);
  const total = uploads.reduce((n, f) => n + f.size, 0) + (audio?.size ?? 0);
  if (total > MAX_BODY_BYTES) throw new InputError("too_large", "Those files are too large together. Try fewer photos or a smaller PDF (4 MB total).");

  // Each file is identified by its bytes. Plain text has no signature, so it must also be declared as text.
  const files: Blob64[] = [];
  const docs: AnalyzeInput["docs"] = [];
  for (const f of uploads) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const name = safeName(f.name);
    const type = sniffType(bytes);
    if (isOneOf(IMAGE_OR_PDF, type)) {
      files.push({ name, mimeType: type, data: Buffer.from(bytes).toString("base64") });
      continue;
    }
    const declaredText = f.type.split(";")[0]?.trim().toLowerCase() === "text/plain" || /\.txt$/i.test(f.name);
    const plain = type === null && declaredText ? readPlainText(bytes) : null;
    if (plain === null) throw new InputError("bad_file", `${name} isn’t supported. Use photos, PDFs or plain text.`);
    docs.push({ name, text: plain.slice(0, MAX_TEXT) });
  }

  let voice: Blob64 | null = null;
  if (audio) {
    const bytes = new Uint8Array(await audio.arrayBuffer());
    const type = sniffType(bytes);
    if (!isOneOf(AUDIO, type)) throw new InputError("bad_file", "That voice note format isn’t supported. Try recording again.");
    voice = { name: "voice note", mimeType: type, data: Buffer.from(bytes).toString("base64") };
  }

  const reply = String(form.get("replyLang") ?? "");
  const known = LANGUAGES.some((l) => l.code === reply);
  // A location is a pair; half of one is treated as none.
  const lat = num(form.get("lat"), -90, 90);
  const lon = num(form.get("lon"), -180, 180);
  const located = lat !== null && lon !== null;

  return {
    text,
    audio: voice,
    files,
    docs,
    lat: located ? lat : null,
    lon: located ? lon : null,
    replyLanguage: known ? getLanguage(reply).english : null,
  };
}
