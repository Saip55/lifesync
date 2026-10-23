import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("home page loads without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("next right step");
  await expect(page.getByText("LifeSync is an AI assistant, not a doctor or emergency service.").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});

test("never scrolls sideways", async ({ page }) => {
  for (const path of ["/", "/try"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
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

test("an example produces an action card", async ({ page }) => {
  await page.goto("/try");
  await page.getByRole("button", { name: /Forwarded message/ }).click();
  await expect(page.getByLabel("What’s happening?")).not.toHaveValue("");
  await page.getByRole("button", { name: "Get my action plan" }).click();
  // With a Gemini key this is a live card; without one, the example's sample card.
  const card = page.getByRole("article", { name: "Action card" });
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(card.getByRole("button", { name: "Copy correction to share" })).toBeVisible();
});

test("switching to Hindi translates the site and is remembered", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Language" }).selectOption("hi");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("सही अगले कदम");
  await page.goto("/try");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("क्या हो रहा है");
});

test("the API rejects an empty request with a readable error", async ({ request }) => {
  const res = await request.post("/api/analyze", { multipart: { text: "" } });
  expect(res.status()).toBe(400);
  expect(await res.text()).toContain('"code":"no_input"');
});
