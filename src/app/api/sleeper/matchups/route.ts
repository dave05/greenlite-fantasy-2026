import { NextResponse } from "next/server";
import {
  getLeagueTeams,
  getNflState,
  getSeasonStandings,
  getWeeklyMatchups,
} from "@/lib/sleeper";
import { regularLeagueId } from "@/lib/leagues";
import { headToHeadPct, teamDistribution } from "@/lib/winodds";

export const dynamic = "force-dynamic";

// Short in-memory cache, keyed by week, so many viewers share one Sleeper fetch.
const cache = new Map<number, { at: number; body: unknown }>();
const TTL_MS = 60000;

// GET /api/sleeper/matchups?week=<optional>
// The Country Club (regular) league: weekly head-to-head scoreboard + season
// standings.
export async function GET(req: Request) {
  try {
    const leagueId = await regularLeagueId();
    if (!leagueId) return NextResponse.json({ connected: false });

    const state = await getNflState();
    const { searchParams } = new URL(req.url);
    const weekOverride = Number(searchParams.get("week"));
    const week =
      Number.isFinite(weekOverride) && weekOverride > 0
        ? weekOverride
        : Math.max(1, state?.week ?? 1);

    const now = Date.now();
    const hit = cache.get(week);
    if (hit && now - hit.at < TTL_MS) {
      return NextResponse.json(hit.body, { headers: { "Cache-Control": "no-store" } });
    }

    const [matchups, season, teams] = await Promise.all([
      getWeeklyMatchups(leagueId, week),
      getSeasonStandings(leagueId),
      getLeagueTeams(leagueId, week),
    ]);

    // Estimated head-to-head win % per team, from projected-final distributions.
    const teamList = teams?.teams ?? [];
    const distByRoster = new Map(teamList.map((t) => [t.rosterId, teamDistribution(t)]));
    const winPct: Record<number, number> = {};
    for (const mu of matchups?.matchups ?? []) {
      const [a, b] = mu.teams;
      const da = a ? distByRoster.get(a.rosterId) : undefined;
      const db = b ? distByRoster.get(b.rosterId) : undefined;
      if (a && b && da && db) {
        const [pa, pb] = headToHeadPct(da, db);
        winPct[a.rosterId] = pa;
        winPct[b.rosterId] = pb;
      }
    }

    const body = {
      connected: true,
      week,
      seasonType: state?.season_type ?? null,
      matchups,
      season,
      teams: teamList,
      winPct,
    };
    cache.set(week, { at: now, body });
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/sleeper/matchups]", err);
    return NextResponse.json({ error: "Failed to load matchups." }, { status: 500 });
  }
}
