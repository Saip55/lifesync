// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SCENARIOS } from "@/lib/scenarios";
import type { AnalyzeResult } from "@/lib/schema";
import { en } from "@/lib/i18n";
import { axeViolations } from "@/test/axe";
import { ActionCard } from "./ActionCard";

vi.mock("qrcode", () => ({ toDataURL: vi.fn(() => Promise.resolve("data:image/png;base64,QR")) }));

const sample = (id: string) => {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`no scenario ${id}`);
  return s.sample;
};

const withCard = (id: string, over: Partial<AnalyzeResult["card"]>, rest: Partial<AnalyzeResult> = {}): AnalyzeResult => {
  const base = sample(id);
  return { ...base, ...rest, card: { ...base.card, ...over } };
};

const stubClipboard = () => {
  const writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  return writeText;
};

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "share");
});

describe("ActionCard", () => {
  it("shows the risk as text, not colour alone", () => {
    render(<ActionCard result={sample("medical")} />);
    expect(screen.getByText("High risk")).toBeInTheDocument();
  });

  it("shows a prominent 112 call link when risk is critical", () => {
    render(<ActionCard result={withCard("flood", { risk_level: "critical" })} />);
    expect(screen.getByRole("link", { name: /Call 112/ })).toHaveAttribute("href", "tel:112");
  });

  it("flags a card whose fact-check did not complete", () => {
    render(<ActionCard result={{ ...sample("medical"), verified: false }} />);
    expect(screen.getByText(/Verification did not complete/)).toBeInTheDocument();
  });

  it("renders model text as text, never as HTML", () => {
    const { container } = render(<ActionCard result={withCard("rumour", { situation: '<img src=x onerror="alert(1)">' })} />);
    expect(container.querySelector("img[onerror]")).toBeNull();
    expect(screen.getByText('<img src=x onerror="alert(1)">')).toBeInTheDocument();
  });

  it("marks the card with its own language for screen readers and speech", () => {
    render(<ActionCard result={withCard("flood", { language_code: "mr" })} />);
    expect(screen.getByRole("article", { name: "Action card" })).toHaveAttribute("lang", "mr");
  });

  it("exposes confidence as a labelled meter", () => {
    render(<ActionCard result={withCard("rumour", { confidence: 73 })} />);
    const meter = screen.getByRole("meter", { name: "Confidence" });
    expect(meter).toHaveAttribute("aria-valuenow", "73");
    expect(meter).toHaveAttribute("aria-valuetext", "73%");
  });

  it("copies the rumour correction and announces it", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    render(<ActionCard result={sample("rumour")} />);
    await user.click(screen.getByRole("button", { name: "Copy correction to share" }));
    expect(writeText).toHaveBeenCalledWith(sample("rumour").card.rumor_verdict?.correction);
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
  });

  it("stays calm when the clipboard is blocked", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } });
    render(<ActionCard result={sample("rumour")} />);
    await user.click(screen.getByRole("button", { name: "Copy correction to share" }));
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("shares the plan through the phone's share sheet", async () => {
    const user = userEvent.setup();
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    render(<ActionCard result={sample("medical")} />);
    await user.click(screen.getByRole("button", { name: "Share plan" }));
    expect(share).toHaveBeenCalledWith({ title: "LifeSync", text: expect.stringContaining("Do this now") });
  });

  it("copies the plan where there is no share sheet, or the share fails", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    render(<ActionCard result={sample("medical")} />);
    await user.click(screen.getByRole("button", { name: "Share plan" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(en.card.shareFooter));
    expect(screen.getByRole("status")).toHaveTextContent("Plan copied");

    Object.defineProperty(navigator, "share", { configurable: true, value: () => Promise.reject(new Error("not allowed")) });
    writeText.mockClear();
    await user.click(screen.getByRole("button", { name: /Plan copied|Share plan/ }));
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("does nothing more when the user closes the share sheet", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    Object.defineProperty(navigator, "share", { configurable: true, value: () => Promise.reject(new DOMException("cancelled", "AbortError")) });
    render(<ActionCard result={sample("medical")} />);
    await user.click(screen.getByRole("button", { name: "Share plan" }));
    expect(writeText).not.toHaveBeenCalled();
  });

  it("labels live signals in the site language and marks links that open a new tab", () => {
    render(<ActionCard result={sample("flood")} />);
    expect(screen.getByText("Weather")).toBeInTheDocument();
    const source = screen.getAllByRole("link", { name: /opens in a new tab/ })[0];
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("lists contacts as one-tap calls", () => {
    render(<ActionCard result={sample("flood")} />);
    const contacts = screen.getByRole("heading", { name: "Who to contact" }).parentElement as HTMLElement;
    for (const link of within(contacts).getAllByRole("link")) expect(link.getAttribute("href")).toMatch(/^tel:\+?\d+$/);
  });

  it("shows a printable health card with a QR summary and a labelled medicines table", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ActionCard result={sample("medical")} />);
    expect(await screen.findByAltText(en.health.qrAlt)).toHaveAttribute("src", "data:image/png;base64,QR");
    expect(screen.getByRole("columnheader", { name: "Dose" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Print / PDF" }));
    expect(print).toHaveBeenCalled();
  });

  it.each(SCENARIOS.map((s) => [s.id] as const))("has no accessibility violations (%s)", async (id) => {
    const { container } = render(<ActionCard result={withCard(id, { risk_level: "critical" })} />);
    await screen.findAllByRole("article");
    expect(await axeViolations(container)).toEqual([]);
  });
});
