import "server-only";

// Open-Meteo: free, no key. Falls back to Mumbai when location is not shared.
export const DEFAULT_PLACE = { lat: 19.076, lon: 72.8777, name: "Mumbai (default)" };

type OpenMeteo = {
  current?: { temperature_2m?: number; precipitation?: number; wind_speed_10m?: number };
  hourly?: { time?: string[]; precipitation_probability?: (number | null)[]; precipitation?: (number | null)[] };
  daily?: { precipitation_sum?: (number | null)[] };
};

export type Weather = { place: string; summary: string };

export async function fetchWeather(lat: number | null, lon: number | null, signal: AbortSignal): Promise<Weather> {
  const here = lat !== null && lon !== null;
  const p = here ? { lat, lon, name: "your location" } : DEFAULT_PLACE;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: p.lat.toFixed(3),
    longitude: p.lon.toFixed(3),
    current: "temperature_2m,precipitation,wind_speed_10m",
    hourly: "precipitation_probability,precipitation",
    daily: "precipitation_sum",
    forecast_days: "2",
    timezone: "auto",
  }).toString();

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return { place: p.name, summary: summarizeWeather((await res.json()) as OpenMeteo, p.name) };
}

export function summarizeWeather(w: OpenMeteo, place: string, now = new Date()) {
  const times = w.hourly?.time ?? [];
  // Open-Meteo hours are local "YYYY-MM-DDTHH:00"; start from the hour we are in now.
  const from = Math.max(
    0,
    times.findIndex((t) => new Date(t).getTime() + 3_600_000 > now.getTime()),
  );
  const next12 = (arr: (number | null)[] | undefined) => (arr ?? []).slice(from, from + 12).map((v) => v ?? 0);
  const rainChance = Math.max(0, ...next12(w.hourly?.precipitation_probability));
  const rainMm = next12(w.hourly?.precipitation).reduce((a, b) => a + b, 0);
  const [today = 0, tomorrow = 0] = (w.daily?.precipitation_sum ?? []).map((v) => v ?? 0);
  const c = w.current ?? {};
  return [
    `Place: ${place}.`,
    c.temperature_2m !== undefined
      ? `Now ${Math.round(c.temperature_2m)}°C, wind ${Math.round(c.wind_speed_10m ?? 0)} km/h, rain ${c.precipitation ?? 0} mm.`
      : "",
    `Next 12 h: up to ${rainChance}% chance of rain, about ${rainMm.toFixed(1)} mm.`,
    `Rain today ${today.toFixed(1)} mm, tomorrow ${tomorrow.toFixed(1)} mm.`,
  ]
    .filter(Boolean)
    .join(" ");
}
