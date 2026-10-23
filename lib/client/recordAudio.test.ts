// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatSeconds, MAX_RECORDING_SECONDS, pickMimeType, useRecorder } from "./recordAudio";

const stopTrack = vi.fn();
const recorders: FakeRecorder[] = [];

class FakeRecorder {
  static isTypeSupported = (t: string) => t === "audio/webm";
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  readonly mimeType: string;
  constructor(
    readonly stream: MediaStream,
    readonly options: MediaRecorderOptions
  ) {
    this.mimeType = options.mimeType ?? "audio/webm";
    recorders.push(this);
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["voice"]) });
    this.onstop?.();
  }
}

const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;

beforeEach(() => {
  vi.useFakeTimers();
  recorders.length = 0;
  stopTrack.mockReset();
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(() => Promise.resolve(stream)) } });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("pickMimeType", () => {
  it("prefers compact Opus and falls back to what the browser supports", () => {
    expect(pickMimeType(() => true)).toBe("audio/webm;codecs=opus");
    expect(pickMimeType((t) => t === "audio/mp4")).toBe("audio/mp4");
    expect(pickMimeType(() => false)).toBe("");
  });
});

describe("useRecorder", () => {
  it("records at a low bitrate, counts seconds, and hands over the note when stopped", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useRecorder(onDone, vi.fn()));
    await act(async () => result.current.toggle());
    expect(result.current.recording).toBe(true);
    expect(recorders[0]?.options).toMatchObject({ mimeType: "audio/webm", audioBitsPerSecond: 32_000 });

    await act(() => vi.advanceTimersByTime(3_000));
    expect(result.current.seconds).toBe(3);

    act(() => result.current.toggle());
    expect(result.current.recording).toBe(false);
    expect(onDone).toHaveBeenCalledWith({ blob: expect.any(Blob), seconds: 3 });
    expect(stopTrack).toHaveBeenCalled();
  });

  it("stops by itself at the 30-second cap", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useRecorder(onDone, vi.fn()));
    await act(async () => result.current.toggle());
    await act(() => vi.advanceTimersByTime((MAX_RECORDING_SECONDS + 5) * 1000));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]?.[0].seconds).toBe(MAX_RECORDING_SECONDS);
  });

  it("reports a blocked microphone", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(() => Promise.reject(new Error("denied"))) } });
    const onError = vi.fn();
    const { result } = renderHook(() => useRecorder(vi.fn(), onError));
    await act(async () => result.current.toggle());
    expect(onError).toHaveBeenCalledTimes(1);
    expect(result.current.recording).toBe(false);
  });

  it("releases the microphone when the page is left mid-recording", async () => {
    const { result, unmount } = renderHook(() => useRecorder(vi.fn(), vi.fn()));
    await act(async () => result.current.toggle());
    unmount();
    expect(stopTrack).toHaveBeenCalled();
  });
});

describe("formatSeconds", () => {
  it("shows m:ss", () => {
    expect(formatSeconds(7)).toBe("0:07");
    expect(formatSeconds(30)).toBe("0:30");
  });
});
