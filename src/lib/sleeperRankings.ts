// Free overall "big board" from Sleeper. Sleeper's player dump carries a
// `search_rank` field that is a genuine CROSS-POSITION ordering (a proxy for
// overall draft value) - unlike the FantasyPros public key, which only returns
// position-relative ranks and forbids the overall endpoint. We fetch the dump,
// keep fantasy-relevant players, sort by search_rank, and return the top N.

import type { RankedPlayer } from "./fantasypros";
import { getDefenseVsPosition } from "./defense";

const PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";
const FANTASY_POS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);
// Sleeper labels team defenses "DEF"; the rest of the app uses "DST".
const POS_MAP: Record<string, string> = { DEF: "DST" };

type SleeperPlayer = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string | null;
  active?: boolean;
  search_rank?: number | null;
};

// The dump is ~14MB, so cache the processed board in-memory (Fluid Compute
// reuses instances). ADP barely moves preseason - a few hours is plenty.
let cache: { at: number; players: RankedPlayer[] } | null = null;
const TTL_MS = 24 * 60 * 60 * 1000; // rankings refresh once a day

// The full processed big board (overall rank + per-position rank), cached.
async function getSleeperBoard(): Promise<RankedPlayer[] | null> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.players;

  try {
    const res = await fetch(PLAYERS_URL, { cache: "no-store" });
    if (!res.ok) return cache?.players ?? null;
    const dump = (await res.json()) as Record<string, SleeperPlayer>;

    const rows = Object.values(dump)
      .filter(
        (p) =>
          p.position &&
          FANTASY_POS.has(p.position) &&
          p.search_rank != null &&
          p.active !== false,
      )
      .sort((a, b) => (a.search_rank ?? 1e9) - (b.search_rank ?? 1e9));

    const posCount: Record<string, number> = {};
    const players: RankedPlayer[] = [];
    for (const p of rows) {
      const rawPos = p.position!;
      const pos = POS_MAP[rawPos] ?? rawPos;
      posCount[pos] = (posCount[pos] ?? 0) + 1;
      const name =
        p.full_name ||
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        (pos === "DST" ? `${p.team ?? ""} D/ST`.trim() : "");
      if (!name) continue;
      players.push({
        rank: players.length + 1, // sequential overall slot (breaks search_rank ties)
        posRank: `${pos}${posCount[pos]}`,
        tier: 0,
        name,
        team: p.team ?? "",
        position: pos,
        bye: null,
        delta: 0,
      });
      if (players.length >= 400) break; // deep enough for every position tab
    }

    cache = { at: now, players };
    return players;
  } catch {
    return cache?.players ?? null;
  }
}

// Team defenses have no search_rank in the player dump, so they never make the
// main board. Sleeper's projections endpoint DOES cover them - rank the 32 DEFs
// by projected PPR points. Names/teams come embedded, so it's one small call.
type ProjItem = {
  player_id?: string;
  team?: string | null;
  player?: { first_name?: string; last_name?: string } | null;
  stats?: { pts_ppr?: number } | null;
};
let dstCache: { at: number; players: RankedPlayer[] } | null = null;

async function getSleeperDST(year: string): Promise<RankedPlayer[] | null> {
  const now = Date.now();
  if (dstCache && now - dstCache.at < TTL_MS) return dstCache.players;
  try {
    const url = `https://api.sleeper.app/projections/nfl/${year}?season_type=regular&position%5B%5D=DEF&order_by=pts_ppr`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return dstCache?.players ?? null;
    const data = (await res.json()) as ProjItem[];
    const players: RankedPlayer[] = (data ?? [])
      .map((x) => ({
        pts: x.stats?.pts_ppr ?? 0,
        name:
          [x.player?.first_name, x.player?.last_name].filter(Boolean).join(" ") ||
          `${x.team ?? x.player_id ?? ""} D/ST`.trim(),
        team: x.team ?? x.player_id ?? "",
      }))
      .filter((r) => r.name)
      .sort((a, b) => b.pts - a.pts)
      .map((r, i) => ({
        rank: i + 1,
        posRank: `DST${i + 1}`,
        tier: 0,
        name: r.name,
        team: r.team,
        position: "DST",
        bye: null,
        delta: 0,
      }));
    if (players.length === 0) return dstCache?.players ?? null;
    dstCache = { at: now, players };
    return players;
  } catch {
    return dstCache?.players ?? null;
  }
}

// position "ALL" -> overall big board (top `limit`).
// position "DST" -> team defenses, ranked by Sleeper's projected PPR points.
// position "QB".. -> only that position, re-numbered 1..N (keeps its posRank).
export async function getSleeperRankings(
  position: string,
  limit = 100,
  year = "2026",
): Promise<RankedPlayer[] | null> {
  if (position === "DST") return getSleeperDST(year);

  const board = await getSleeperBoard();
  if (!board) return null;

  if (position === "ALL") return board.slice(0, limit);

  return board
    .filter((p) => p.position === position)
    .map((p, i) => ({ ...p, rank: i + 1 })); // rank = position rank in this view
}

// Weekly rankings: players ranked by their PROJECTED points for a given NFL
// week (Sleeper projections). Unlike the draft board (season-long value), this
// answers "who should I start THIS week." Cached per (year,week,position).
const WEEKLY_POS = ["QB", "RB", "WR", "TE", "K", "DEF"] as const;
const weeklyCache = new Map<string, { at: number; players: RankedPlayer[] }>();
const WEEKLY_TTL_MS = 24 * 60 * 60 * 1000; // once a day

type WeeklyProj = {
  player_id?: string;
  team?: string | null;
  opponent?: string | null;
  player?: { first_name?: string; last_name?: string; position?: string } | null;
  stats?: { pts_ppr?: number } | null;
};

// Defense-vs-position: how many PPR points each NFL defense has ALLOWED to each
// position across completed weeks. Rank 1 = allows the most = softest matchup.
// Built from real weekly stats; empty until at least one week has been played.
type StatRow = {
  opponent?: string | null; // the defense this player faced
  player?: { position?: string } | null;
  stats?: { pts_ppr?: number } | null;
};
const RANKABLE_POS = new Set(["QB", "RB", "WR", "TE", "K"]);
const defCache = new Map<string, { at: number; map: Map<string, number> }>();
const DEF_TTL_MS = 24 * 60 * 60 * 1000; // once a day

// Returns Map<`${team}|${POS}`, rank> where rank is 1..N (1 = most allowed).
async function getDefenseVsPos(
  year: string,
  throughWeek: number,
): Promise<Map<string, number>> {
  if (throughWeek < 1) return new Map();
  const key = `${year}-${throughWeek}`;
  const now = Date.now();
  const hit = defCache.get(key);
  if (hit && now - hit.at < DEF_TTL_MS) return hit.map;

  const totals = new Map<string, number>(); // `${team}|${pos}` -> total allowed
  const weeksFaced = new Map<string, Set<number>>(); // team -> weeks played

  const qs = ["QB", "RB", "WR", "TE", "K"].map((p) => `position[]=${p}`).join("&");
  for (let w = 1; w <= throughWeek; w++) {
    let rows: StatRow[] = [];
    try {
      const res = await fetch(
        `https://api.sleeper.app/stats/nfl/${year}/${w}?season_type=regular&${qs}`,
        { cache: "no-store" },
      );
      if (res.ok) rows = (await res.json()) as StatRow[];
    } catch {
      rows = [];
    }
    for (const r of rows) {
      const def = r.opponent;
      const pos = r.player?.position;
      if (!def || !pos || !RANKABLE_POS.has(pos)) continue;
      const pts = r.stats?.pts_ppr ?? 0;
      totals.set(`${def}|${pos}`, (totals.get(`${def}|${pos}`) ?? 0) + pts);
      if (!weeksFaced.has(def)) weeksFaced.set(def, new Set());
      weeksFaced.get(def)!.add(w);
    }
  }

  // Per-position: rank teams by AVG allowed per game (fair across byes).
  const ranks = new Map<string, number>();
  for (const pos of RANKABLE_POS) {
    const perTeam: { team: string; avg: number }[] = [];
    for (const [k, total] of totals) {
      const [team, p] = k.split("|");
      if (p !== pos) continue;
      const games = weeksFaced.get(team)?.size || 1;
      perTeam.push({ team, avg: total / games });
    }
    perTeam.sort((a, b) => b.avg - a.avg);
    perTeam.forEach((t, i) => ranks.set(`${t.team}|${pos}`, i + 1));
  }

  if (ranks.size > 0) defCache.set(key, { at: now, map: ranks });
  return ranks.size > 0 ? ranks : hit?.map ?? ranks;
}

export async function getWeeklyRankings(
  position: string,
  week: number,
  limit = 100,
  year = "2026",
): Promise<RankedPlayer[] | null> {
  const key = `${year}-${week}-${position}`;
  const now = Date.now();
  const hit = weeklyCache.get(key);
  if (hit && now - hit.at < WEEKLY_TTL_MS) return hit.players;

  const qs = WEEKLY_POS.map((p) => `position[]=${p}`).join("&");
  // Opponent defense ranks are built from weeks already completed (week - 1).
  const [projRes, defRanks] = await Promise.all([
    (async () => {
      try {
        const res = await fetch(
          `https://api.sleeper.app/projections/nfl/${year}/${week}?season_type=regular&${qs}`,
          { cache: "no-store" },
        );
        return res.ok ? ((await res.json()) as WeeklyProj[]) : [];
      } catch {
        return [] as WeeklyProj[];
      }
    })(),
    // DraftEdge has preseason ranks (works Week 1); fall back to Sleeper actuals.
    (async () => {
      const de = await getDefenseVsPosition();
      if (de.size > 0) return de;
      return getDefenseVsPos(year, week - 1);
    })(),
  ]);
  const rows = projRes;
  if (rows.length === 0) return hit?.players ?? null;

  const wantAll = position === "ALL";
  // oppRank here is DEFENSE STRENGTH: 1 = strongest D (fewest FPA = toughest
  // matchup), 32 = weakest (most FPA = easiest). Sleeper's projection carries
  // the ranking; the matchup only gently breaks ties - a light +/-4% tilt, so a
  // weak defense (high rank) nudges up and a strong one (low rank) nudges down.
  const MATCHUP_TILT = 0.04;
  const matchupFactor = (oppRank: number | null): number => {
    if (!oppRank) return 1;
    // 32 teams: rank 16.5 = neutral. (rank - 16.5) / 15.5 spans -1..+1.
    return 1 + MATCHUP_TILT * ((oppRank - 16.5) / 15.5);
  };

  const mapped = rows
    .map((r) => {
      const pl = r.player ?? {};
      const rawPos = pl.position ?? "";
      const pos = POS_MAP[rawPos] ?? rawPos;
      const opp = r.opponent ?? "";
      const proj = r.stats?.pts_ppr ?? 0;
      // Sources rank 1 = most FPA allowed (weakest D). Flip so 1 = strongest D.
      const rawRank = opp ? defRanks.get(`${opp}|${rawPos}`) ?? null : null;
      const oppRank = rawRank ? 33 - rawRank : null;
      return {
        name: `${pl.first_name ?? ""} ${pl.last_name ?? ""}`.trim(),
        team: r.team ?? "",
        opp,
        rawPos,
        position: pos,
        proj,
        oppRank,
        // matchup-adjusted score used ONLY for ordering; display keeps raw proj.
        adj: proj * matchupFactor(oppRank),
      };
    })
    .filter((p) => p.name && (wantAll || p.position === position))
    .sort((a, b) => b.adj - a.adj);

  const posCount: Record<string, number> = {};
  const players: RankedPlayer[] = mapped.slice(0, limit).map((p, i) => {
    posCount[p.position] = (posCount[p.position] ?? 0) + 1;
    return {
      rank: i + 1,
      posRank: `${p.position}${posCount[p.position]}`,
      tier: 0,
      name: p.name,
      team: p.team,
      position: p.position,
      bye: null,
      delta: 0,
      proj: Math.round(p.proj * 10) / 10,
      opp: p.opp,
      oppRank: p.oppRank,
    };
  });

  weeklyCache.set(key, { at: now, players });
  return players;
}
