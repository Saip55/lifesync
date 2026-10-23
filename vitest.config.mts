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
  },
});
