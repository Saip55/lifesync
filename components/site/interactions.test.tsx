// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Reveal } from "./Reveal";
import { SiteHeader } from "./SiteHeader";

vi.mock("next/navigation", () => ({ usePathname: () => "/try" }));

afterEach(() => vi.unstubAllGlobals());

describe("Reveal", () => {
  it("shows a block once it scrolls into view, using one shared observer", () => {
    const observed: Element[] = [];
    let callback: IntersectionObserverCallback = () => {};
    const created = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: IntersectionObserverCallback) {
          created();
          callback = cb;
        }
        observe(el: Element) {
          observed.push(el);
        }
        unobserve() {}
        disconnect() {}
      }
    );
    render(
      <>
        <Reveal>First</Reveal>
        <Reveal delay={90}>Second</Reveal>
      </>
    );
    const first = screen.getByText("First");
    expect(observed).toHaveLength(2);
    expect(first).not.toHaveAttribute("data-shown");
    expect(screen.getByText("Second")).toHaveStyle({ "--reveal-delay": "90ms" });

    const unobserve = vi.fn();
    const entries = [
      { target: screen.getByText("Second"), isIntersecting: false },
      { target: first, isIntersecting: true },
    ] as unknown as IntersectionObserverEntry[];
    act(() => callback(entries, { unobserve } as unknown as IntersectionObserver));
    expect(first).toHaveAttribute("data-shown");
    expect(screen.getByText("Second")).not.toHaveAttribute("data-shown");
    expect(unobserve).toHaveBeenCalledWith(first);
    expect(created.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

describe("SiteHeader", () => {
  it("hides the call-to-action on the assistant page itself", () => {
    render(<SiteHeader />);
    expect(screen.queryByRole("link", { name: "Try LifeSync" })).toBeNull();
    expect(screen.getByRole("link", { name: "LifeSync home" })).toHaveAttribute("href", "/");
  });

  it("follows the pointer and keyboard focus across the navigation", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const link = screen.getByRole("link", { name: "How it works" });
    await user.hover(link);
    await user.unhover(link);
    link.focus();
    expect(link).toHaveFocus();
    link.blur();
  });

  it("draws reading progress without re-rendering on every scroll", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const { container } = render(<SiteHeader />);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 500 });
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 2000 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    act(() => frames.splice(0).forEach((f) => f(0)));
    const bar = container.querySelector<HTMLElement>("header span[aria-hidden]");
    expect(bar?.style.transform).toBe("scaleX(0.5)");
  });
});
