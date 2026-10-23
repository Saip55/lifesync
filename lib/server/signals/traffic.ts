import "server-only";
import { env } from "../env";

// Only runs with GOOGLE_MAPS_KEY and a shared location: finds the nearest matching place
// (Places Text Search) and the drive time to it with and without traffic (Routes API).

export type Traffic = { place: string; address: string; withTraffic: number; withoutTraffic: number; km: number };

type LatLng = { latitude: number; longitude: number };

export async function fetchTraffic(lat: number, lon: number, placeType: string, signal: AbortSignal): Promise<Traffic | null> {
  const key = env().GOOGLE_MAPS_KEY;
  if (!key) return null;
  const origin: LatLng = { latitude: lat, longitude: lon };

  const placeRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({ textQuery: placeType, pageSize: 1, locationBias: { circle: { center: origin, radius: 10_000 } } }),
  });
  if (!placeRes.ok) throw new Error(`Places ${placeRes.status}`);
  const { places } = (await placeRes.json()) as {
    places?: { displayName?: { text?: string }; formattedAddress?: string; location?: LatLng }[];
  };
  const place = places?.[0];
  if (!place?.location) return null;

  const routeRes = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters",
    },
    body: JSON.stringify({
      origin: { location: { latLng: origin } },
      destination: { location: { latLng: place.location } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
    }),
  });
  if (!routeRes.ok) throw new Error(`Routes ${routeRes.status}`);
  const { routes } = (await routeRes.json()) as { routes?: { duration?: string; staticDuration?: string; distanceMeters?: number }[] };
  const r = routes?.[0];
  if (!r?.duration) return null;

  const minutes = (d?: string) => Math.round(parseFloat(d ?? "0") / 60);
  return {
    place: place.displayName?.text ?? placeType,
    address: place.formattedAddress ?? "",
    withTraffic: minutes(r.duration),
    withoutTraffic: minutes(r.staticDuration ?? r.duration),
    km: Math.round((r.distanceMeters ?? 0) / 100) / 10,
  };
}

export const describeTraffic = (t: Traffic) =>
  `${t.place}, ${t.address}: ${t.km} km, about ${t.withTraffic} min with current traffic (${t.withoutTraffic} min without).`;
