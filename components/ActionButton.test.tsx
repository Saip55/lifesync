// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Action } from "@/lib/schema";
import { ActionButton } from "./ActionButton";

const action = (over: Partial<Action>): Action => ({
  title: "Call an ambulance",
  detail: "Say chest pain and dizziness",
  urgency: "now",
  type: "call",
  payload: { phone: "108" },
  needs_confirmation: true,
  ...over,
});

const renderInList = (a: Action) =>
  render(
    <ol>
      <ActionButton action={a} index={0} />
    </ol>
  );

afterEach(() => vi.restoreAllMocks());

describe("ActionButton", () => {
  it("never calls without a confirming tap, and says exactly what will happen", async () => {
    const user = userEvent.setup();
    const location = { href: "" };
    vi.spyOn(window, "location", "get").mockReturnValue(location as Location);
    renderInList(action({}));

    const toggle = screen.getByRole("button", { name: /Call an ambulance/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(location.href).toBe("");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("group", { name: "Confirm action" });
    expect(toggle).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveTextContent("This opens your phone to call 108.");

    await user.click(screen.getByRole("button", { name: "Yes, call 108" }));
    expect(location.href).toBe("tel:108");
    expect(screen.queryByRole("group")).toBeNull();
    // Focus goes back to the action, not lost to the page.
    expect(toggle).toHaveFocus();
  });

  it("can be cancelled from the keyboard", async () => {
    const user = userEvent.setup();
    renderInList(action({}));
    await user.tab();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.getByRole("button", { name: /Call an ambulance/ })).toHaveFocus();
  });

  it("shows the drafted message before opening WhatsApp", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderInList(action({ title: "Tell neighbours", type: "message", payload: { message: "Water is rising, please help", phone: "98200 00000" } }));
    await user.click(screen.getByRole("button", { name: /Tell neighbours/ }));
    expect(screen.getByText("Water is rising, please help")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open WhatsApp" }));
    expect(open).toHaveBeenCalledWith("https://wa.me/919820000000?text=Water%20is%20rising%2C%20please%20help", "_blank", "noopener");
  });

  it("opens directions straight away when no confirmation is needed", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderInList(action({ title: "Go to Ruby Hall", type: "navigate", payload: { destination: "Ruby Hall Clinic, Pune" }, needs_confirmation: false }));
    const button = screen.getByRole("button", { name: /Go to Ruby Hall/ });
    expect(button).not.toHaveAttribute("aria-expanded");
    await user.click(button);
    expect(open).toHaveBeenCalledWith(expect.stringContaining("destination=Ruby%20Hall%20Clinic%2C%20Pune"), "_blank", "noopener");
  });

  it("downloads a calendar reminder", async () => {
    const user = userEvent.setup();
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderInList(action({ title: "Take BP tablet", type: "reminder", payload: { time_iso: "2030-01-01T08:00:00Z" }, needs_confirmation: false }));
    await user.click(screen.getByRole("button", { name: /Take BP tablet/ }));
    expect(click).toHaveBeenCalled();
  });

  it("shows advice as plain text, not as a button", () => {
    renderInList(action({ title: "Keep the oxygen machine on a high shelf", type: "info", payload: {}, needs_confirmation: false }));
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Keep the oxygen machine on a high shelf")).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
  });
});
