// Server-side FantasyPros public API v2 client. The API key lives only in
// process.env.FANTASYPROS_API_KEY - never shipped to the browser.

const BASE = "https://api.fantasypros.com/public/v2/json/nfl";

export type RankedPlayer = {
  rank: number;
  posRank: string;
  tier: number;
  name: string;
  team: string;
  position: string;
  bye: number | null;
  delta: number; // ECR movement (+ up / - down)
  proj?: number; // projected points (weekly rankings only)
  opp?: string; // weekly opponent team code (weekly rankings only)
  oppRank?: number | null; // opp defense rank vs this position (1 = softest)
};

type RawPlayer = {
  rank_ecr?: number;
  pos_rank?: string;
  tier?: number;
  player_name?: string;
  player_short_name?: string;
  player_team_id?: string;
  player_position_id?: string;
  player_bye_week?: string | number | null;
  player_ecr_delta?: number | null;
};

export type Rankings = {
  year: string;
  type: string;
  scoring: string;
  position: string;
  players: RankedPlayer[];
};

// Draft (preseason) consensus rankings for a position. week=0 = draft rankings.
export async function getConsensusRankings(
  position: string,
  year: string,
): Promise<Rankings | null> {
  const key = process.env.FANTASYPROS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `${BASE}/${year}/consensus-rankings?position=${encodeURIComponent(position)}&scoring=PPR&week=0`,
      { headers: { "x-api-key": key }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const d = (await res.json()) as {
      year?: string;
      type?: string;
      scoring?: string;
      position_id?: string;
      players?: RawPlayer[];
    };
    const players: RankedPlayer[] = (d.players ?? []).map((p) => ({
      rank: p.rank_ecr ?? 0,
      posRank: p.pos_rank ?? "",
      tier: p.tier ?? 0,
      name: p.player_name ?? p.player_short_name ?? "",
      team: p.player_team_id ?? "",
      position: p.player_position_id ?? "",
      bye: p.player_bye_week ? Number(p.player_bye_week) : null,
      delta: p.player_ecr_delta ?? 0,
    }));
    return {
      year: d.year ?? year,
      type: d.type ?? "Draft PPR",
      scoring: d.scoring ?? "PPR",
      position: d.position_id ?? position,
      players,
    };
  } catch {
    return null;
  }
}

// The public API key is hard-capped at ~10 players per position and forbids the
// cross-position "ALL"/"OP" endpoint (403). So a true overall top-100 is not
// available on this tier. The best honest board we can build is every position
// stacked in draft-relevant order, each player keeping its real FantasyPros
// position rank - we do NOT invent a fake unified 1..N ranking (that would rank
// a kicker above a WR2). The UI renders these grouped by position.
const MERGE_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"] as const;

export async function getMergedRankings(year: string): Promise<Rankings | null> {
  const key = process.env.FANTASYPROS_API_KEY;
  if (!key) return null;

  const results = await Promise.all(
    MERGE_POSITIONS.map((p) => getConsensusRankings(p, year)),
  );
  const byPos = new Map<string, Rankings>();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r) byPos.set(MERGE_POSITIONS[i], r);
  }
  if (byPos.size === 0) return null;

  // Stack in draft order, preserving each player's own position rank.
  const merged: RankedPlayer[] = [];
  for (const pos of MERGE_POSITIONS) {
    const r = byPos.get(pos);
    if (!r) continue;
    for (const pl of r.players) {
      if (!pl.name) continue;
      merged.push({ ...pl, position: pl.position || pos });
    }
  }

  return {
    year,
    type: "Consensus PPR",
    scoring: "PPR",
    position: "ALL",
    players: merged,
  };
}
