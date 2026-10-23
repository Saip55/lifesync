import { defineConfig, devices } from "@playwright/test";

// Runs against BASE_URL if given; otherwise builds and serves the production app on :3100,
// so the tests see the real security headers, CSP and compiled bundles.
// Locally it uses the installed Edge (no browser download); CI installs Chromium.
const baseURL = process.env.BASE_URL ?? "http://localhost:3100";
const channel = process.env.CI ? undefined : "msedge";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, channel, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "phone", use: { viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true, channel } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm run build && npm run start -- --port 3100", url: baseURL, reuseExistingServer: !process.env.CI, timeout: 300_000 },
});
