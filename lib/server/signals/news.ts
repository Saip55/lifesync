import "server-only";

// Google News RSS: free, no key. Headlines are passed to the critic as data only.

export type Headline = { title: string; source: string; date: string; link: string };

export async function fetchNews(query: string, signal: AbortSignal): Promise<Headline[]> {
  const q = query.trim().slice(0, 120);
  if (!q) return [];
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:7d`)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Google News ${res.status}`);
  return parseRss(await res.text()).slice(0, 5);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " " };
const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#\d+|[a-z]+);/gi, (m, e: string) => ENTITIES[e.toLowerCase()] ?? (e.startsWith("#") ? String.fromCharCode(Number(e.slice(1))) : m))
    .trim();

const tag = (item: string, name: string) => decode(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(item)?.[1] ?? "");

export function parseRss(xml: string): Headline[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items.map((item) => {
    const source = tag(item, "source");
    // Google appends " - Source" to titles; drop it since source is its own field.
    const title = tag(item, "title").replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
    return { title, source, date: tag(item, "pubDate"), link: tag(item, "link") };
  });
}
