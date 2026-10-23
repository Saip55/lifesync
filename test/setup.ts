import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Testing Library only auto-cleans with Vitest globals on; unmount between DOM tests ourselves.
afterEach(async () => {
  if (typeof document !== "undefined") (await import("@testing-library/react")).cleanup();
});
