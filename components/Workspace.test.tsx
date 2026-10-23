// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SCENARIOS } from "@/lib/scenarios";
import type { StreamEvent } from "@/lib/schema";
import { axeViolations } from "@/test/axe";
import { Workspace } from "./Workspace";

vi.mock("qrcode", () => ({ toDataURL: vi.fn(() => Promise.resolve("data:image/png;base64,QR")) }));

const rumour = SCENARIOS.find((s) => s.id === "rumour");
if (!rumour) throw new Error("missing rumour scenario");

// A streamed /api/analyze reply the test pushes events into.
function controlledStream() {
  let push: (e: StreamEvent) => void = () => {};
  let end: () => void = () => {};
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      push = (e) => c.enqueue(new TextEncoder().encode(`${JSON.stringify(e)}\n`));
      end = () => c.close();
    },
  });
  return { body, push: (e: StreamEvent) => push(e), end: () => end() };
}

const reply = (...events: StreamEvent[]) => {
  const s = controlledStream();
  queueMicrotask(() => {
    events.forEach(s.push);
    s.end();
  });
  return new Response(s.body, { headers: { "content-type": "application/x-ndjson" } });
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  Object.assign(URL, { createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() });
  window.history.replaceState(null, "", "/try");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const textbox = () => screen.getByRole("textbox", { name: "What’s happening?" });
const submit = () => screen.getByRole("button", { name: "Get my action plan" });
const sentForm = () => fetchMock.mock.calls[0]?.[1]?.body as FormData;

describe("Workspace", () => {
  it("asks for something before analysing", async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    await user.click(submit());
    expect(screen.getByRole("alert")).toHaveTextContent("Add a few words, a photo, or a voice note first.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fills the form from an example chip", async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    const chip = screen.getByRole("button", { name: /Forwarded message/ });
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(textbox()).toHaveValue(rumour.prefill);
  });

  it("opens with an example from the link it was given", () => {
    window.history.replaceState(null, "", "/try?example=flood");
    render(<Workspace />);
    expect(textbox()).toHaveValue(SCENARIOS.find((s) => s.id === "flood")?.prefill);
  });

  it("shows real progress, then the card, and moves focus to it", async () => {
    const user = userEvent.setup();
    const stream = controlledStream();
    fetchMock.mockResolvedValue(new Response(stream.body, { headers: { "content-type": "application/x-ndjson" } }));
    render(<Workspace />);
    await user.type(textbox(), "My father has chest pain");
    await user.selectOptions(screen.getByRole("combobox", { name: "Answer me in" }), "ur");
    const button = submit();
    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Working on it…");
    stream.push({ type: "stage", stage: 2 });
    expect(await screen.findByText("Step 3 of 4: Planning")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your action plan" })).toHaveAttribute("aria-busy", "true");

    stream.push({ type: "result", result: rumour.sample });
    stream.end();
    const heading = await screen.findByRole("heading", { level: 2, name: "Your action plan" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole("article", { name: "Action card" })).toBeInTheDocument();

    const form = sentForm();
    expect(form.get("text")).toBe("My father has chest pain");
    expect(form.get("replyLang")).toBe("ur");
  });

  it("offers every one of the twelve reply languages", () => {
    render(<Workspace />);
    const select = screen.getByRole("combobox", { name: "Answer me in" });
    expect(within(select).getAllByRole("option")).toHaveLength(13);
    expect(within(select).getByRole("group", { name: "More languages" })).toBeInTheDocument();
  });

  it("shows the example's sample card when live analysis is not configured", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(reply({ type: "error", code: "not_configured", message: "no key" }));
    render(<Workspace />);
    await user.click(screen.getByRole("button", { name: /Forwarded message/ }));
    await user.click(submit());
    expect(await screen.findByText("Sample card: live analysis needs the Gemini key")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy correction to share" })).toBeInTheDocument();
  });

  it("explains a failure in plain words and can try again", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(reply({ type: "error", code: "rate_limited", message: "slow down" }));
    render(<Workspace />);
    await user.type(textbox(), "help");
    await user.click(submit());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("That didn’t work");
    expect(alert).toHaveTextContent("Too many requests at once.");

    fetchMock.mockResolvedValueOnce(reply({ type: "result", result: rumour.sample }));
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("article", { name: "Action card" })).toBeInTheDocument();
  });

  it("says when it cannot reach the server", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<Workspace />);
    await user.type(textbox(), "help");
    await user.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t reach LifeSync.");
  });

  it("starts over with an empty form and focus back in the text box", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(reply({ type: "result", result: rumour.sample }));
    render(<Workspace />);
    await user.type(textbox(), "help");
    await user.click(submit());
    await user.click(await screen.findByRole("button", { name: "Start over" }));
    expect(textbox()).toHaveValue("");
    expect(textbox()).toHaveFocus();
    expect(screen.getByText("Your action plan appears here")).toBeInTheDocument();
  });

  it("adds and removes photos, and refuses more than 4 MB", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<Workspace />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("no file input");

    await user.upload(input, new File(["%PDF-1.7"], "report.pdf", { type: "application/pdf" }));
    const attached = screen.getByRole("list", { name: "Attached" });
    expect(within(attached).getByText("report.pdf")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove report.pdf" }));
    expect(screen.queryByRole("list", { name: "Attached" })).toBeNull();

    await user.upload(input, new File([new Uint8Array(5 * 1024 * 1024)], "huge.pdf", { type: "application/pdf" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Those files are too large together.");
  });

  it("adds the location when allowed and explains when it is not", async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: 18.52, longitude: 73.85 } } as GeolocationPosition));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    fetchMock.mockResolvedValue(reply({ type: "result", result: rumour.sample }));
    render(<Workspace />);
    await user.click(screen.getByRole("button", { name: /My location/ }));
    expect(screen.getByRole("button", { name: /Location added/ })).toHaveAttribute("aria-pressed", "true");
    await user.type(textbox(), "flooding");
    await user.click(submit());
    await screen.findByRole("article");
    expect([sentForm().get("lat"), sentForm().get("lon")]).toEqual(["18.52", "73.85"]);

    getCurrentPosition.mockImplementation((_ok: PositionCallback, fail?: PositionErrorCallback | null) => fail?.({} as GeolocationPositionError));
    await user.click(screen.getByRole("button", { name: /Location added/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Location is off");
  });

  it("explains a blocked microphone", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: () => Promise.reject(new Error("denied")) } });
    render(<Workspace />);
    await user.click(screen.getByRole("button", { name: /Record voice/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Microphone access was blocked.");
  });

  it("has no accessibility violations, before and after a result", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(reply({ type: "result", result: SCENARIOS[0]?.sample ?? rumour.sample }));
    const { container } = render(<Workspace />);
    expect(await axeViolations(container)).toEqual([]);
    await user.type(textbox(), "help");
    await user.click(submit());
    await screen.findByRole("article");
    expect(await axeViolations(container)).toEqual([]);
  });
});
