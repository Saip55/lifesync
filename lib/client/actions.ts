import type { Action } from "@/lib/schema";

// Only digits and a leading +, so a model-written number can never become a USSD code (*#…#) or a URL.
const dialable = (phone: string) => phone.trim().replace(/(?!^\+)[^\d]/g, "");

export function telHref(phone: string) {
  return `tel:${dialable(phone)}`;
}

// wa.me needs the full international number without "+"; a bare 10-digit Indian mobile gets +91.
export function whatsappNumber(phone: string) {
  const d = dialable(phone).replace(/^\+/, "");
  return /^[6-9]\d{9}$/.test(d) ? `91${d}` : d;
}

export function whatsappHref(message: string, phone?: string) {
  return `https://wa.me/${phone ? whatsappNumber(phone) : ""}?text=${encodeURIComponent(message)}`;
}

export function mapsHref(destination: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/([,;])/g, "\\$1")
    .replace(/\r\n|\r|\n/g, "\\n");

const encoder = new TextEncoder();

// RFC 5545: content lines are at most 75 octets; longer ones continue on a line starting with a space.
// Splits between characters, never inside a multi-byte one (Indic scripts are 3 bytes per character).
export function foldIcsLine(line: string) {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** A calendar event for the action, with a 5-minute alarm. */
export function reminderIcs(action: Action, now = new Date()) {
  const parsed = action.payload.time_iso ? new Date(action.payload.time_iso) : null;
  const start = parsed && !isNaN(parsed.getTime()) && parsed.getTime() > now.getTime() ? parsed : new Date(now.getTime() + 3_600_000);
  const end = new Date(start.getTime() + 15 * 60_000);
  const summary = icsText(action.payload.message || action.title);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LifeSync//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@lifesync`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${icsText(action.detail)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT5M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${summary}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(foldIcsLine)
    .join("\r\n");
}

// Triggers a download of the reminder; nothing is sent anywhere.
export function downloadReminder(action: Action) {
  const url = URL.createObjectURL(new Blob([reminderIcs(action)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "lifesync-reminder.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
