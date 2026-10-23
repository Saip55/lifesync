import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

// Browser APIs jsdom does not implement, stubbed once for every DOM test.
beforeEach(() => {
  if (typeof window === "undefined") return;
  window.matchMedia ??= vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.IntersectionObserver ??= class {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

// Testing Library only auto-cleans with Vitest globals on; unmount between DOM tests ourselves.
afterEach(async () => {
  if (typeof document !== "undefined") (await import("@testing-library/react")).cleanup();
});
