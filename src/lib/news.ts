// Lean NFL-headline fetcher used by the Gazette to tie real news to league fates
// ("your QB blew out a knee AND you got chopped"). Titles only, no image
// enrichment - matching player names is all we need here. The full News tab has
// its own richer route; this stays cheap and separately cached.

type Feed = { url: string; source: string };
const FEEDS: Feed[] = [
  { url: "https://profootballtalk.nbcsports.com/feed/", source: "ProFootballTalk" },
  { url: "https://sports.yahoo.com/nfl/rss.xml", source: "Yahoo NFL" },
  { url: "https://www.espn.com/espn/rss/nfl/news", source: "ESPN" },
  { url: "https://www.rotoballer.com/feed", source: "RotoBaller" },
  { url: "https://www.rotowire.com/rss/news.php?sport=NFL", source: "RotoWire" },
  { url: "https://www.cbssports.com/rss/headlines/nfl/", source: "CBS Sports" },
  { url: "https://www.fantasypros.com/nfl/news.xml", source: "FantasyPros" },
  { url: "https://sports.yahoo.com/fantasy/football/rss.xml", source: "Yahoo Fantasy" },
];

export type Headline = { title: string; source: string; published: number };

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

function titlesOf(xml: string, source: string): Headline[] {
  const out: Headline[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const b of blocks) {
    const m = b.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!m) continue;
    const title = decode(m[1]);
    const dateStr =
      (b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
        b.match(/<published[^>]*>([\s\S]*?)<\/published>/i))?.[1] ?? "";
    const published = dateStr ? Date.parse(dateStr) : 0;
    if (title) out.push({ title, source, published: Number.isNaN(published) ? 0 : published });
  }
  return out;
}

let cache: { at: number; items: Headline[] } | null = null;
const TTL_MS = 20 * 60 * 1000; // refresh every 20 min so the wire stays current

export async function getHeadlines(): Promise<Headline[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.items;
  const all = (
    await Promise.all(
      FEEDS.map(async (f) => {
        try {
          const res = await fetch(f.url, {
            headers: {
              "user-agent": "Mozilla/5.0",
              accept: "application/rss+xml, application/xml, text/xml",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return [];
          return titlesOf(await res.text(), f.source).slice(0, 40);
        } catch {
          return [];
        }
      }),
    )
  ).flat();
  all.sort((a, b) => b.published - a.published);
  const items = all.slice(0, 200);
  if (items.length) cache = { at: now, items };
  return items.length ? items : cache?.items ?? [];
}

export type NewsCategory = "injury" | "suspension" | "benched" | "trade" | "bigGame" | "legal" | "other";

// Classify a headline so the roast can pick the right joke. Order matters:
// the most roastable (and specific) categories win.
export function classify(title: string): NewsCategory {
  const t = title.toLowerCase();
  if (/(injur|\bacl\b|\bmcl\b|torn|tear|hamstring|knee|ankle|concuss|carted|placed on ir|\bir\b|out for the season|ruled out|high-ankle|achilles|fracture|broken)/.test(t))
    return "injury";
  if (/(suspend|suspension|banned)/.test(t)) return "suspension";
  if (/(arrest|charged|dui|lawsuit|police|court)/.test(t)) return "legal";
  if (/(traded|trade to|dealt to|acquired|waived|released|cut by)/.test(t)) return "trade";
  if (/(benched|demoted|loses starting|backup role)/.test(t)) return "benched";
  if (/(career-high|career high|explod|goes off|monster|three touchdown|four touchdown|breakout|player of the week)/.test(t))
    return "bigGame";
  return "other";
}
