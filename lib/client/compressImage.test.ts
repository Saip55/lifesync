// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compressImage } from "./compressImage";

const drawImage = vi.fn();
let output: Blob | null;

beforeEach(() => {
  drawImage.mockReset();
  output = new Blob([new Uint8Array(10)], { type: "image/jpeg" });
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(() => Promise.resolve({ width: 4000, height: 3000, close: vi.fn() })),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, cb: BlobCallback) {
    cb(output);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const photo = (size = 1_000) => new File([new Uint8Array(size)], "rx.png", { type: "image/png" });

describe("compressImage", () => {
  it("shrinks the longest side to 1280 px and re-encodes as JPEG", async () => {
    const out = await compressImage(photo());
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1280, 960);
    expect(out.name).toBe("rx.jpg");
    expect(out.type).toBe("image/jpeg");
    expect(out.size).toBe(10);
  });

  it("never upscales a small photo", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(() => Promise.resolve({ width: 800, height: 600, close: vi.fn() })),
    );
    await compressImage(photo());
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 800, 600);
  });

  it("keeps the original when re-encoding would not make it smaller", async () => {
    const original = photo(5);
    expect(await compressImage(original)).toBe(original);
  });

  it("sends PDFs and undecodable images unchanged", async () => {
    const pdf = new File(["%PDF"], "report.pdf", { type: "application/pdf" });
    expect(await compressImage(pdf)).toBe(pdf);
    const heic = new File(["x"], "photo.heic", { type: "image/heic" });
    expect(await compressImage(heic)).toBe(heic);

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(() => Promise.reject(new Error("decode failed"))),
    );
    const broken = photo();
    expect(await compressImage(broken)).toBe(broken);
  });

  it("falls back to the original when the canvas cannot encode", async () => {
    output = null;
    const original = photo();
    expect(await compressImage(original)).toBe(original);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(await compressImage(original)).toBe(original);
  });
});
