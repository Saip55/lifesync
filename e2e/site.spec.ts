import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

// Collects page errors, console errors and CSP violations while a test runs.
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("home page loads without errors or CSP violations", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("next right step");
  await expect(page.getByText("LifeSync is an AI assistant, not a doctor or emergency service.").first()).toBeVisible();
  await page.goto("/try");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("sends strict security headers", async ({ page }) => {
  const res = await page.goto("/");
  const h = res?.headers() ?? {};
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("no-referrer");
  expect(h["permissions-policy"]).toContain("camera=()");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-powered-by"]).toBeUndefined();
});

for (const path of ["/", "/try", "/does-not-exist"]) {
  test(`has no WCAG 2.2 AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    expect(await axe(page)).toEqual([]);
  });
}

test("has no WCAG 2.2 AA violations in Hindi", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Language" }).selectOption("hi");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  expect(await axe(page)).toEqual([]);
});

test("never scrolls sideways", async ({ page }) => {
  for (const path of ["/", "/try"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("a keyboard user can skip straight to the main content", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Tab order is checked in Chromium.");
  await page.goto("/try");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("the header CTA opens the assistant page", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 640, "The header CTA is hidden on phones; the hero CTA covers it.");
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Try LifeSync" }).click();
  await expect(page).toHaveURL(/\/try$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tell us what’s happening");
});

test("asks for input before analysing", async ({ page }) => {
  await page.goto("/try");
  await page.getByRole("button", { name: "Get my action plan" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Add a few words" })).toBeVisible();
});

test("an example produces an accessible action card and moves focus to it", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/try");
  await page.getByRole("button", { name: /Forwarded message/ }).click();
  await expect(page.getByLabel("What’s happening?")).not.toHaveValue("");
  await page.getByRole("button", { name: "Get my action plan" }).click();
  // With a Gemini key this is a live card; without one, the example's sample card.
  const card = page.getByRole("article", { name: "Action card" });
  await expect(card).toBeVisible({ timeout: 75_000 });
  await expect(page.getByRole("heading", { level: 2, name: "Your action plan" })).toBeFocused();
  await expect(card.getByRole("button", { name: "Copy correction to share" })).toBeVisible();
  expect(await axe(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test("switching to Hindi translates the site and is remembered", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Language" }).selectOption("hi");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("सही अगले कदम");
  await page.goto("/try");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("क्या हो रहा है");
});

test("an unknown page explains itself and offers 112", async ({ page }) => {
  const res = await page.goto("/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /112/ })).toHaveAttribute("href", "tel:112");
});

test.describe("API", () => {
  test("rejects an empty request with a readable error", async ({ request }) => {
    const res = await request.post("/api/analyze", { multipart: { text: "" } });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('"code":"no_input"');
  });

  test("refuses requests from other websites", async ({ request }) => {
    const res = await request.post("/api/analyze", { multipart: { text: "hello" }, headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" } });
    expect(res.status()).toBe(403);
  });

  test("rejects a program disguised as a photo", async ({ request }) => {
    const res = await request.post("/api/analyze", {
      multipart: { files: { name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("MZ\x90\x00 not really a photo") } },
    });
    expect(res.status()).toBe(415);
  });
});
