// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LANG_STORAGE_KEY } from "@/lib/i18n";
import { LanguageProvider, useLanguage } from "./LanguageProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

function Probe() {
  const { t } = useLanguage();
  return <h1>{t.workspace.step1}</h1>;
}

const app = () =>
  render(
    <LanguageProvider>
      <LanguageSwitcher />
      <Probe />
    </LanguageProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  document.documentElement.setAttribute("data-lang-pending", "");
});
afterEach(() => vi.restoreAllMocks());

describe("LanguageProvider", () => {
  it("starts in English and reveals the page", async () => {
    app();
    expect(screen.getByRole("heading")).toHaveTextContent("What’s happening?");
    await vi.waitFor(() => expect(document.documentElement.hasAttribute("data-lang-pending")).toBe(false));
  });

  it("switches language on demand, updates <html lang> and remembers the choice", async () => {
    const user = userEvent.setup();
    app();
    await user.selectOptions(screen.getByRole("combobox", { name: "Language" }), "hi");
    expect(await screen.findByRole("heading", { name: "क्या हो रहा है?" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("hi");
    expect(document.documentElement.dir).toBe("ltr");
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe("hi");
  });

  it("applies a saved language after hydration, before showing the page", async () => {
    localStorage.setItem(LANG_STORAGE_KEY, "ta");
    app();
    await vi.waitFor(() => expect(document.documentElement.lang).toBe("ta"));
    expect(screen.getByRole("heading").textContent).toMatch(/[஀-௿]/);
    expect(document.documentElement.hasAttribute("data-lang-pending")).toBe(false);
  });

  it("ignores an unknown saved value and survives blocked storage", async () => {
    localStorage.setItem(LANG_STORAGE_KEY, "xx");
    app();
    await vi.waitFor(() => expect(document.documentElement.hasAttribute("data-lang-pending")).toBe(false));
    expect(document.documentElement.lang).toBe("en");

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const user = userEvent.setup();
    app();
    await user.selectOptions(screen.getAllByRole("combobox", { name: "Language" })[1] as HTMLElement, "bn");
    await vi.waitFor(() => expect(document.documentElement.lang).toBe("bn"));
  });
});
