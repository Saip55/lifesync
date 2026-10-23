import { defineConfig, devices } from "@playwright/test";

// Runs against BASE_URL if given (for example a production build), otherwise the dev server on :3000.
// Uses the installed Edge, so no browser download is needed.
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL, channel: "msedge" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], channel: "msedge" } },
    { name: "phone", use: { viewport: { width: 360, height: 780 }, hasTouch: true, channel: "msedge" } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
