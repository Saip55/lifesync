// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SCENARIOS } from "@/lib/scenarios";
import type { AnalyzeResult } from "@/lib/schema";
import { ActionCard } from "./ActionCard";

const sample = (id: string) => {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`no scenario ${id}`);
  return s.sample;
};

describe("ActionCard", () => {
  it("shows the risk as text, not colour alone", () => {
    render(<ActionCard result={sample("medical")} />);
    expect(screen.getByText("High risk")).toBeInTheDocument();
  });

  it("shows a prominent 112 call link when risk is critical", () => {
    const base = sample("flood");
    const result: AnalyzeResult = { ...base, card: { ...base.card, risk_level: "critical" } };
    render(<ActionCard result={result} />);
    expect(screen.getByRole("link", { name: /Call 112/ })).toHaveAttribute("href", "tel:112");
  });

  it("flags a card whose fact-check did not complete", () => {
    render(<ActionCard result={{ ...sample("medical"), verified: false }} />);
    expect(screen.getByText(/Verification did not complete/)).toBeInTheDocument();
  });

  it("renders model text as text, never as HTML", () => {
    const base = sample("rumour");
    const result: AnalyzeResult = { ...base, card: { ...base.card, situation: '<img src=x onerror="alert(1)">' } };
    const { container } = render(<ActionCard result={result} />);
    expect(container.querySelector("img[onerror]")).toBeNull();
    expect(screen.getByText('<img src=x onerror="alert(1)">')).toBeInTheDocument();
  });

  it("shows the rumour verdict with a copy button", () => {
    render(<ActionCard result={sample("rumour")} />);
    expect(screen.getByRole("button", { name: "Copy correction to share" })).toBeInTheDocument();
  });
});
