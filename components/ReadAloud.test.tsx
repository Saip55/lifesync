// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReadAloud } from "./ReadAloud";

let voices: Pick<SpeechSynthesisVoice, "lang" | "name">[] = [];
let voicesChanged: () => void = () => {};
const speak = vi.fn();
const cancel = vi.fn();

class Utterance {
  voice: unknown = null;
  lang = "";
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly text: string) {}
}

beforeEach(() => {
  voices = [];
  speak.mockReset();
  cancel.mockReset();
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => voices,
    speak,
    cancel,
    addEventListener: (_: string, fn: () => void) => (voicesChanged = fn),
    removeEventListener: vi.fn(),
  });
});
afterEach(() => {
  // Unmount while the speech stub still exists: the component cancels speech on the way out.
  cleanup();
  vi.unstubAllGlobals();
});

describe("ReadAloud", () => {
  it("stays hidden when the device has no voice for the card's language", () => {
    voices = [{ lang: "en-US", name: "English" }];
    render(<ReadAloud text="नमस्ते" lang="hi" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("appears once a matching voice loads, and reads or stops on tap", async () => {
    const user = userEvent.setup();
    render(<ReadAloud text="पानी घर में आ रहा है" lang="hi-IN" />);
    voices = [{ lang: "hi-IN", name: "Hindi" }];
    act(() => voicesChanged());

    const button = screen.getByRole("button", { name: "Read aloud" });
    await user.click(button);
    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: "पानी घर में आ रहा है", lang: "hi-IN" }));
    expect(screen.getByRole("button", { name: "Stop" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Stop" }));
    expect(cancel).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Read aloud" })).toHaveAttribute("aria-pressed", "false");
  });

  it("resets when speech finishes on its own", async () => {
    const user = userEvent.setup();
    voices = [{ lang: "mr-IN", name: "Marathi" }];
    render(<ReadAloud text="पाणी" lang="mr" />);
    await user.click(screen.getByRole("button", { name: "Read aloud" }));
    const utterance = speak.mock.calls[0]?.[0] as Utterance;
    act(() => utterance.onend?.());
    expect(screen.getByRole("button", { name: "Read aloud" })).toBeInTheDocument();
  });
});
