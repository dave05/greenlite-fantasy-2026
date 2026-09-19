// Defense-vs-position matchup ranks, scraped from DraftEdge's public table.
// Unlike Sleeper's actuals (empty until games are played), DraftEdge publishes
// preseason projected ranks, so the weekly matchup column works from Week 1.
// Rank 1 = defense allows the MOST fantasy points to that position = softest.

const NAME_TO_ABBR: Record<string, string> = {
  "arizona cardinals": "ARI",
  "atlanta falcons": "ATL",
  "baltimore ravens": "BAL",
  "buffalo bills": "BUF",
  "carolina panthers": "CAR",
  "chicago bears": "CHI",
  "cincinnati bengals": "CIN",
  "cleveland browns": "CLE",
  "dallas cowboys": "DAL",
  "denver broncos": "DEN",
  "detroit lions": "DET",
  "green bay packers": "GB",
  "houston texans": "HOU",
  "indianapolis colts": "IND",
  "jacksonville jaguars": "JAX",
  "kansas city chiefs": "KC",
  "las vegas raiders": "LV",
  "los angeles chargers": "LAC",
  "los angeles rams": "LAR",
  "miami dolphins": "MIA",
  "minnesota vikings": "MIN",
  "new england patriots": "NE",
  "new orleans saints": "NO",
  "new york giants": "NYG",
  "new york jets": "NYJ",
  "philadelphia eagles": "PHI",
  "pittsburgh steelers": "PIT",
  "san francisco 49ers": "SF",
  "seattle seahawks": "SEA",
  "tampa bay buccaneers": "TB",
  "tennessee titans": "TEN",
  "washington commanders": "WAS",
};

const VALID_ABBR = new Set(Object.values(NAME_TO_ABBR));

// DraftEdge's team cell can be "Dallas Cowboys" or, in newer markup, the
// abbreviation glued on: "Dallas CowboysDAL". Handle both.
function teamAbbr(cell: string): string | undefined {
  const trailing = cell.match(/([A-Z]{2,3})$/);
  if (trailing && VALID_ABBR.has(trailing[1])) return trailing[1];
  // strip any trailing caps run, then map the remaining full name
  const name = cell.replace(/[A-Z]{2,3}$/, "").trim().toLowerCase();
  return NAME_TO_ABBR[name] ?? NAME_TO_ABBR[cell.toLowerCase()];
}

const DE_POSITIONS = ["qb", "rb", "wr", "te"] as const;

let cache: { at: number; map: Map<string, number> } | null = null;
const TTL_MS = 24 * 60 * 60 * 1000; // once a day

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function fetchPos(pos: string): Promise<[string, number][]> {
  try {
    const res = await fetch(
      `https://draftedge.com/nfl/nfl-defense-vs-pos/?pos=${pos}`,
      {
        headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
        cache: "no-store",
        signal: AbortSignal.timeout(9000),
      },
    );
    if (!res.ok) return [];
    const html = await res.text();
    const table = html.match(/<table[\s\S]*?<\/table>/i);
    if (!table) return [];
    const rows = table[0].match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    const out: [string, number][] = [];
    for (const r of rows) {
      const cells = (r.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) ?? []).map((c) =>
        decode(c.replace(/<\/?t[dh][^>]*>/gi, "")),
      );
      if (cells.length < 2) continue;
      const rank = Number(cells[0]);
      const abbr = teamAbbr(cells[1]);
      if (!Number.isFinite(rank) || !abbr) continue;
      out.push([`${abbr}|${pos.toUpperCase()}`, rank]);
    }
    return out;
  } catch {
    return [];
  }
}

// Map<`${TEAM}|${POS}`, rank>. POS is QB/RB/WR/TE (uppercased).
export async function getDefenseVsPosition(): Promise<Map<string, number>> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.map;

  const results = await Promise.all(DE_POSITIONS.map(fetchPos));
  const map = new Map<string, number>();
  for (const pairs of results) for (const [k, v] of pairs) map.set(k, v);

  if (map.size > 0) cache = { at: now, map };
  return map.size > 0 ? map : cache?.map ?? map;
}
