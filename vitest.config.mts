import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // "server-only" throws outside a React Server Components build; tests import server modules directly.
    alias: { "server-only": new URL("./test/server-only-stub.ts", import.meta.url).pathname.replace(/^\/(\w:)/, "$1") },
  },
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "e2e", ".next"],
    setupFiles: ["./test/setup.ts"],
    // Rendering whole pages in jsdom and running axe on them can take a few seconds on a cold start.
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      // The root layout only wires fonts (next/font needs the Next compiler); the browser tests cover it.
      exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts", "app/layout.tsx"],
      reporter: ["text-summary", "text", "html", "lcov"],
      // The build fails if coverage drops below these.
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 92 },
    },
  },
});
