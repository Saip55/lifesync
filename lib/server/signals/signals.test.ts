import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchNews, parseRss } from "./news";
import { DEFAULT_PLACE, fetchWeather, summarizeWeather } from "./weather";
import { describeTraffic, fetchTraffic } from "./traffic";

const fetchMock = vi.fn<typeof fetch>();
const signal = new AbortController().signal;

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const urlOf = (i = 0) => new URL(String(fetchMock.mock.calls[i]?.[0]));

describe("parseRss", () => {
  it("reads title, source, date and link, and strips the source suffix", () => {
    const xml = `<rss><channel>
      <item><title>No plan to shut ATMs, says RBI &amp; banks - The Hindu</title><link>https://news.example/a</link>
      <pubDate>Thu, 22 Oct 2026 10:00:00 GMT</pubDate><source url="https://thehindu.com">The Hindu</source></item>
      <item><title><![CDATA[Heavy rain alert for Pune - Times of India]]></title><link>https://news.example/b</link>
      <pubDate>Thu, 22 Oct 2026 09:00:00 GMT</pubDate><source url="https://toi.in">Times of India</source></item>
    </channel></rss>`;
    expect(parseRss(xml)).toEqual([
      { title: "No plan to shut ATMs, says RBI & banks", source: "The Hindu", date: "Thu, 22 Oct 2026 10:00:00 GMT", link: "https://news.example/a" },
      { title: "Heavy rain alert for Pune", source: "Times of India", date: "Thu, 22 Oct 2026 09:00:00 GMT", link: "https://news.example/b" },
    ]);
  });

  it("decodes numeric entities and tolerates missing fields", () => {
    expect(parseRss("<item><title>Rain &#8212; alert &unknown;</title></item>")).toEqual([{ title: "Rain — alert &unknown;", source: "", date: "", link: "" }]);
  });

  it("returns an empty list for a feed with no items", () => {
    expect(parseRss("<rss><channel></channel></rss>")).toEqual([]);
  });
});

describe("fetchNews", () => {
  it("searches the last week of Indian news and returns at most five headlines", async () => {
    const items = Array.from({ length: 7 }, (_, i) => `<item><title>Story ${i} - PTI</title><source>PTI</source></item>`).join("");
    fetchMock.mockResolvedValue(new Response(`<rss>${items}</rss>`));
    const news = await fetchNews("  Pune flood alert  ", signal);
    expect(news).toHaveLength(5);
    expect(news[0]).toMatchObject({ title: "Story 0", source: "PTI" });
    const url = urlOf();
    expect(url.hostname).toBe("news.google.com");
    expect(url.searchParams.get("q")).toBe("Pune flood alert when:7d");
    expect(url.searchParams.get("gl")).toBe("IN");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ signal });
  });

  it("skips the request for an empty query and reports a failed one", async () => {
    await expect(fetchNews("   ", signal)).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(new Response("nope", { status: 503 }));
    await expect(fetchNews("flood", signal)).rejects.toThrow("Google News 503");
  });
});

describe("fetchWeather", () => {
  const body = { current: { temperature_2m: 31 }, hourly: { time: [], precipitation_probability: [], precipitation: [] }, daily: { precipitation_sum: [1, 2] } };

  it("asks Open-Meteo about the user's location", async () => {
    fetchMock.mockResolvedValue(Response.json(body));
    const w = await fetchWeather(18.52041, 73.85674, signal);
    expect(w.place).toBe("your location");
    expect(w.summary).toContain("Now 31°C");
    expect(urlOf().searchParams.get("latitude")).toBe("18.520");
    expect(urlOf().searchParams.get("forecast_days")).toBe("2");
  });

  it("falls back to a default city without a location, and reports errors", async () => {
    fetchMock.mockResolvedValue(Response.json(body));
    const w = await fetchWeather(null, null, signal);
    expect(w.place).toBe(DEFAULT_PLACE.name);
    expect(urlOf().searchParams.get("latitude")).toBe(DEFAULT_PLACE.lat.toFixed(3));
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));
    await expect(fetchWeather(null, null, signal)).rejects.toThrow("Open-Meteo 500");
  });
});

describe("summarizeWeather", () => {
  it("summarises the next 12 hours of rain from now", () => {
    const now = new Date("2026-10-23T10:00");
    const time = Array.from({ length: 24 }, (_, h) => `2026-10-23T${String(h).padStart(2, "0")}:00`);
    const summary = summarizeWeather(
      {
        current: { temperature_2m: 27.4, precipitation: 2, wind_speed_10m: 18 },
        hourly: {
          time,
          precipitation_probability: time.map((_, h) => (h === 3 ? 100 : h === 14 ? 85 : 10)),
          precipitation: time.map((_, h) => (h >= 10 && h < 22 ? 2 : 50)),
        },
        daily: { precipitation_sum: [48.2, 12] },
      },
      "your location",
      now
    );
    expect(summary).toContain("Now 27°C");
    expect(summary).toContain("up to 85% chance of rain"); // the 100% at 03:00 is in the past
    expect(summary).toContain("about 24.0 mm");
    expect(summary).toContain("Rain today 48.2 mm, tomorrow 12.0 mm");
  });

  it("copes with an empty forecast", () => {
    expect(summarizeWeather({}, "Mumbai")).toBe("Place: Mumbai. Next 12 h: up to 0% chance of rain, about 0.0 mm. Rain today 0.0 mm, tomorrow 0.0 mm.");
  });
});

describe("fetchTraffic", () => {
  it("needs a Maps key", async () => {
    vi.stubEnv("GOOGLE_MAPS_KEY", "");
    await expect(fetchTraffic(18.5, 73.8, "hospital", signal)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("finds the nearest place, then the drive time with and without traffic", async () => {
    vi.stubEnv("GOOGLE_MAPS_KEY", "maps-key");
    fetchMock
      .mockResolvedValueOnce(Response.json({ places: [{ displayName: { text: "Ruby Hall" }, formattedAddress: "Pune", location: { latitude: 18.53, longitude: 73.87 } }] }))
      .mockResolvedValueOnce(Response.json({ routes: [{ duration: "900s", staticDuration: "600s", distanceMeters: 5250 }] }));
    const t = await fetchTraffic(18.5, 73.8, "hospital", signal);
    expect(t).toEqual({ place: "Ruby Hall", address: "Pune", withTraffic: 15, withoutTraffic: 10, km: 5.3 });
    expect(describeTraffic(t!)).toBe("Ruby Hall, Pune: 5.3 km, about 15 min with current traffic (10 min without).");
    // The key goes in a header, never in a URL.
    const [placesUrl, placesInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(placesUrl)).not.toContain("maps-key");
    expect(new Headers(placesInit?.headers).get("X-Goog-Api-Key")).toBe("maps-key");
  });

  it("returns null when nothing is found and throws on API errors", async () => {
    vi.stubEnv("GOOGLE_MAPS_KEY", "maps-key");
    fetchMock.mockResolvedValueOnce(Response.json({ places: [] }));
    await expect(fetchTraffic(18.5, 73.8, "hospital", signal)).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(Response.json({ places: [{ location: { latitude: 1, longitude: 2 } }] })).mockResolvedValueOnce(Response.json({ routes: [] }));
    await expect(fetchTraffic(18.5, 73.8, "hospital", signal)).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(new Response("", { status: 403 }));
    await expect(fetchTraffic(18.5, 73.8, "hospital", signal)).rejects.toThrow("Places 403");

    fetchMock.mockResolvedValueOnce(Response.json({ places: [{ location: { latitude: 1, longitude: 2 } }] })).mockResolvedValueOnce(new Response("", { status: 500 }));
    await expect(fetchTraffic(18.5, 73.8, "hospital", signal)).rejects.toThrow("Routes 500");
  });
});
