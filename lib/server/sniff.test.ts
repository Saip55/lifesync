import { describe, expect, it } from "vitest";
import { readPlainText, sniffType } from "./sniff";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe("sniffType", () => {
  it.each([
    ["image/jpeg", bytes([0xff, 0xd8, 0xff, 0xe0], "JFIF")],
    ["image/png", bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a])],
    ["image/webp", bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 ")],
    ["image/heic", bytes([0, 0, 0, 24], "ftypheic")],
    ["image/heif", bytes([0, 0, 0, 24], "ftypmif1")],
    ["application/pdf", bytes("%PDF-1.7")],
    ["audio/webm", bytes([0x1a, 0x45, 0xdf, 0xa3])],
    ["audio/ogg", bytes("OggS")],
    ["audio/mp4", bytes([0, 0, 0, 32], "ftypM4A ")],
    ["audio/wav", bytes("RIFF", [0, 0, 0, 0], "WAVEfmt ")],
    ["audio/mpeg", bytes("ID3", [4, 0])],
    ["audio/mpeg", bytes([0xff, 0xfb, 0x90])],
    ["audio/aac", bytes([0xff, 0xf1, 0x50])],
  ])("recognises %s from its bytes", (type, data) => {
    expect(sniffType(data)).toBe(type);
  });

  it("rejects executables, scripts and empty files whatever they are named", () => {
    expect(sniffType(bytes("MZ", [0x90, 0]))).toBeNull(); // Windows .exe
    expect(sniffType(bytes([0x7f], "ELF"))).toBeNull();
    expect(sniffType(bytes("<script>alert(1)</script>"))).toBeNull();
    expect(sniffType(new Uint8Array())).toBeNull();
  });
});

describe("readPlainText", () => {
  it("accepts UTF-8 in any script", () => {
    expect(readPlainText(new TextEncoder().encode("पापा को BP की दवा"))).toBe("पापा को BP की दवा");
  });

  it("rejects binary data and invalid UTF-8", () => {
    expect(readPlainText(bytes("abc", [0], "def"))).toBeNull();
    expect(readPlainText(bytes([0xc3, 0x28]))).toBeNull();
  });
});
