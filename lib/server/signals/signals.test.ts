import { describe, expect, it } from "vitest";
import { parseRss } from "./news";
import { summarizeWeather } from "./weather";

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

  it("returns an empty list for a feed with no items", () => {
    expect(parseRss("<rss><channel></channel></rss>")).toEqual([]);
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
});
