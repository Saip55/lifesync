// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { axeViolations } from "@/test/axe";
import Home from "@/app/page";
import NotFound from "@/app/not-found";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";
import { LanguageProvider } from "../LanguageProvider";
import { SkipLink } from "./SkipLink";
import Try from "@/app/try/page";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const page = (children: React.ReactNode) =>
  render(
    <LanguageProvider>
      <SkipLink />
      {children}
    </LanguageProvider>,
  );

describe("site pages", () => {
  it("home: one h1, the disclaimer, a skip link to the main content, and no accessibility violations", async () => {
    page(<Home />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("contentinfo")).toHaveTextContent("LifeSync is an AI assistant, not a doctor or emergency service.");
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(await axeViolations(document.body, { page: true })).toEqual([]);
  });

  it("try page: the assistant with a way to call 112, and no accessibility violations", async () => {
    page(<Try />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tell us what’s happening");
    expect(screen.getByRole("link", { name: /Call 112/ })).toHaveAttribute("href", "tel:112");
    expect(await axeViolations(document.body, { page: true })).toEqual([]);
  });

  it("not found: explains, links home and offers 112", async () => {
    page(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
    expect(await axeViolations(document.body, { page: true })).toEqual([]);
  });

  it("error: offers a retry and logs no details", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    page(<ErrorPage error={Object.assign(new Error("secret patient data"), { digest: "abc123" })} retry={retry} />);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("Page error:", "Error", "abc123");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
  });

  it("global error: renders its own document that still offers a retry and 112", () => {
    const html = renderToStaticMarkup(<GlobalError error={new Error("boom")} retry={() => {}} />);
    expect(html).toMatch(/^<html lang="en">/);
    expect(html).toContain("Try again");
    expect(html).toContain('href="tel:112"');
    expect(html).not.toContain("boom");
  });
});
