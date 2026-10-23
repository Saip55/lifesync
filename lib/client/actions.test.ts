// @vitest-environment jsdom
import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Action } from "@/lib/schema";
import { downloadReminder, foldIcsLine, mapsHref, reminderIcs, telHref, whatsappHref, whatsappNumber } from "./actions";

const reminder = (over: Partial<Action> = {}): Action => ({
  title: "Take BP tablet",
  detail: "With water, after food",
  urgency: "today",
  type: "reminder",
  payload: {},
  needs_confirmation: false,
  ...over,
});

afterEach(() => vi.restoreAllMocks());

describe("links", () => {
  it("dials only digits, so a model can never trigger a USSD code", () => {
    expect(telHref("+91 98200-00000")).toBe("tel:+919820000000");
    expect(telHref("*#06#")).toBe("tel:06");
    expect(telHref("108")).toBe("tel:108");
  });

  it("formats WhatsApp numbers internationally", () => {
    expect(whatsappNumber("98200 00000")).toBe("919820000000");
    expect(whatsappNumber("+91 98200 00000")).toBe("919820000000");
    expect(whatsappNumber("+44 20 7946 0000")).toBe("442079460000");
    expect(whatsappHref("Water is rising, please come", "98200 00000")).toBe("https://wa.me/919820000000?text=Water%20is%20rising%2C%20please%20come");
    expect(whatsappHref("नमस्ते")).toBe(`https://wa.me/?text=${encodeURIComponent("नमस्ते")}`);
  });

  it("encodes the destination for Google Maps", () => {
    expect(mapsHref("Ruby Hall Clinic, Pune & Co")).toBe("https://www.google.com/maps/dir/?api=1&destination=Ruby%20Hall%20Clinic%2C%20Pune%20%26%20Co");
  });
});

describe("foldIcsLine", () => {
  const octets = (s: string) => new TextEncoder().encode(s).length;

  it("leaves short lines alone", () => {
    expect(foldIcsLine("SUMMARY:Hi")).toBe("SUMMARY:Hi");
  });

  it("keeps every line within 75 octets and never splits a character", () => {
    fc.assert(
      fc.property(fc.string({ unit: fc.constantFrom("a", "ब", "த", "😀", " ", ",") , maxLength: 300 }), (text) => {
        const folded = foldIcsLine(`DESCRIPTION:${text}`);
        const lines = folded.split("\r\n");
        lines.forEach((l) => expect(octets(l)).toBeLessThanOrEqual(75));
        lines.slice(1).forEach((l) => expect(l.startsWith(" ")).toBe(true));
        expect(lines.map((l, i) => (i ? l.slice(1) : l)).join("")).toBe(`DESCRIPTION:${text}`);
      })
    );
  });
});

describe("reminderIcs", () => {
  const now = new Date("2026-10-23T10:00:00Z");

  it("builds a calendar event with a 5-minute alarm at the requested time", () => {
    const ics = reminderIcs(reminder({ payload: { time_iso: "2026-10-23T20:30:00Z" } }), now);
    expect(ics).toContain("DTSTART:20261023T203000Z");
    expect(ics).toContain("DTEND:20261023T204500Z");
    expect(ics).toContain("TRIGGER:-PT5M");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("escapes text so a message cannot add calendar fields", () => {
    const ics = reminderIcs(reminder({ title: "Call; doctor, today", detail: "Line 1\r\nATTENDEE:evil@example.com" }), now);
    expect(ics).toContain("SUMMARY:Call\\; doctor\\, today");
    expect(ics).toContain("DESCRIPTION:Line 1\\nATTENDEE:evil@example.com");
    expect(ics).not.toMatch(/^ATTENDEE/m);
  });

  it("schedules an hour from now when the time is missing, invalid or past", () => {
    for (const time_iso of [undefined, "soon", "2020-01-01T00:00:00Z"]) {
      expect(reminderIcs(reminder({ payload: { time_iso } }), now)).toContain("DTSTART:20261023T110000Z");
    }
  });
});

describe("downloadReminder", () => {
  it("downloads the file locally and frees it afterwards", () => {
    vi.useFakeTimers();
    const create = vi.fn(() => "blob:reminder");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadReminder(reminder());
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith("blob:reminder");
    vi.useRealTimers();
  });
});
