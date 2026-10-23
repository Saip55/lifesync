import "server-only";

// Identifies an upload from its first bytes. The browser-declared Content-Type is never
// trusted on its own: a renamed .exe is rejected, and a HEIC photo with an empty type is accepted.

export const IMAGE_OR_PDF = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"] as const;
export const AUDIO = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/aac"] as const;
export type SniffedType = (typeof IMAGE_OR_PDF)[number] | (typeof AUDIO)[number];

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx"]);
const HEIF_BRANDS = new Set(["mif1", "msf1", "heif", "heim", "heis"]);

const startsWith = (b: Uint8Array, at: number, text: string) => [...text].every((ch, i) => b[at + i] === ch.charCodeAt(0));

/** The real type of a file from its magic bytes, or null if it is nothing LifeSync accepts. */
export function sniffType(b: Uint8Array): SniffedType | null {
  const [b0 = 0, b1 = 0, b2 = 0, b3 = 0] = b;
  if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) return "image/jpeg";
  if (startsWith(b, 0, "\x89PNG\r\n\x1a\n")) return "image/png";
  if (startsWith(b, 0, "RIFF") && startsWith(b, 8, "WEBP")) return "image/webp";
  if (startsWith(b, 0, "RIFF") && startsWith(b, 8, "WAVE")) return "audio/wav";
  if (startsWith(b, 0, "%PDF-")) return "application/pdf";
  if (startsWith(b, 0, "OggS")) return "audio/ogg";
  if (b0 === 0x1a && b1 === 0x45 && b2 === 0xdf && b3 === 0xa3) return "audio/webm";
  if (startsWith(b, 4, "ftyp")) {
    const brand = String.fromCharCode(...b.subarray(8, 12));
    if (HEIC_BRANDS.has(brand)) return "image/heic";
    if (HEIF_BRANDS.has(brand)) return "image/heif";
    return "audio/mp4";
  }
  if (startsWith(b, 0, "ID3")) return "audio/mpeg";
  // MPEG audio frame sync: 11 set bits. Layer bits 00 mean an AAC ADTS stream.
  if (b0 === 0xff && (b1 & 0xe0) === 0xe0) return (b1 & 0x06) === 0 ? "audio/aac" : "audio/mpeg";
  return null;
}

const utf8 = new TextDecoder("utf-8", { fatal: true });

/** Plain text has no magic bytes: accept it only if it is valid UTF-8 with no NUL bytes. */
export function readPlainText(b: Uint8Array): string | null {
  if (b.includes(0)) return null;
  try {
    return utf8.decode(b);
  } catch {
    return null;
  }
}
