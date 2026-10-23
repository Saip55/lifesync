import type { Action } from "@/lib/schema";

const digits = (phone: string) => phone.replace(/[^\d+]/g, "");

export function telHref(phone: string) {
  return `tel:${digits(phone)}`;
}

export function whatsappHref(message: string, phone?: string) {
  const to = phone ? digits(phone).replace(/^\+/, "") : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}

export function mapsHref(destination: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

// Builds a calendar event with a 5-minute alarm and triggers a download.
export function downloadReminder(action: Action) {
  const parsed = action.payload.time_iso ? new Date(action.payload.time_iso) : null;
  const start = parsed && !isNaN(parsed.getTime()) ? parsed : new Date(Date.now() + 3_600_000);
  const end = new Date(start.getTime() + 15 * 60_000);
  const summary = icsText(action.payload.message || action.title);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LifeSync//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@lifesync`,
    `DTSTAMP:${icsDate(new Date())}`,
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
  ].join("\r\n");

  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "lifesync-reminder.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
