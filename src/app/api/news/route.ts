import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Aggregated NFL / fantasy headlines via public RSS. Live tweet streaming from
// insiders isn't possible for free (X killed free API access), so this pulls
// from reputable feeds that carry the same reporting (PFT, Yahoo, ESPN, etc.).
type Feed = { url: string; source: string };
const FEEDS: Feed[] = [
  { url: "https://profootballtalk.nbcsports.com/feed/", source: "ProFootballTalk" },
  { url: "https://sports.yahoo.com/nfl/rss.xml", source: "Yahoo NFL" },
  { url: "https://www.espn.com/espn/rss/nfl/news", source: "ESPN" },
  { url: "https://www.rotoballer.com/feed", source: "RotoBaller" },
];

type Item = {
  title: string;
  link: string;
  source: string;
  published: number;
  image?: string;
};

// Cache so many viewers share one fetch cycle (news moves in minutes, not secs).
let cache: { at: number; items: Item[] } | null = null;
const TTL_MS = 60 * 60 * 1000; // refresh news at most once an hour
// How many top items get a preview image fetched (bounds CPU/bandwidth).
const ENRICH_TOP = 24;

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

// Pull an image straight from the feed item when it carries one.
function feedImage(block: string): string | undefined {
  const media =
    block.match(/<media:content[^>]*url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i) ||
    block.match(/<media:thumbnail[^>]*url="([^"]+)"/i) ||
    block.match(/<enclosure[^>]*url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"[^>]*type="image/i) ||
    block.match(/<img[^>]*src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
  return media ? media[1] : undefined;
}

function parseFeed(xml: string, source: string): Item[] {
  const items: Item[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const b of blocks) {
    const title = tag(b, "title");
    // <link> can be a text node or an atom <link href="..."/>
    let link = tag(b, "link");
    if (!link) {
      const href = b.match(/<link[^>]*href="([^"]+)"/i);
      link = href ? href[1] : "";
    }
    const dateStr = tag(b, "pubDate") || tag(b, "published") || tag(b, "dc:date");
    const published = dateStr ? Date.parse(dateStr) : 0;
    if (title && link) {
      items.push({
        title,
        link,
        source,
        published: Number.isNaN(published) ? 0 : published,
        image: feedImage(b),
      });
    }
  }
  return items;
}

// Fetch a page's og:image (reading only the head via a Range request to stay
// cheap). Returns undefined on any failure so the UI can show a placeholder.
async function ogImage(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0", range: "bytes=0-60000" },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok && res.status !== 206) return undefined;
    const html = await res.text();
    const m =
      html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i) ||
      html.match(/<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/i);
    return m ? m[1] : undefined;
  } catch {
    return undefined;
  }
}

async function fetchFeed(f: Feed): Promise<Item[]> {
  try {
    const res = await fetch(f.url, {
      headers: { "user-agent": "Mozilla/5.0", accept: "application/rss+xml, application/xml, text/xml" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return parseFeed(await res.text(), f.source).slice(0, 15);
  } catch {
    return [];
  }
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json(
      { items: cache.items, sources: FEEDS.map((f) => f.source) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();
    // Newest first; items with no date sink to the bottom.
    all.sort((a, b) => b.published - a.published);
    const items = all.slice(0, 50);

    // Enrich the top items that lack a feed image with their og:image.
    await Promise.all(
      items.slice(0, ENRICH_TOP).map(async (it) => {
        if (!it.image) it.image = await ogImage(it.link);
      }),
    );

    cache = { at: now, items };
    return NextResponse.json(
      { items, sources: FEEDS.map((f) => f.source) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/news]", err);
    return NextResponse.json({ items: [], error: "Failed to load news." }, { status: 500 });
  }
}
