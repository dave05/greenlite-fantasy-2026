import { NextResponse } from "next/server";
import {
  ELIMINATION_WEEK,
  getWeeklyStandings,
  getEliminations,
  getLeagueTeams,
  getNflState,
} from "@/lib/sleeper";
import { choppedLeagueId } from "@/lib/leagues";
import { survivalPct, teamDistribution } from "@/lib/winodds";

export const dynamic = "force-dynamic";

// Short in-memory cache so many viewers share one Sleeper fetch (saves CPU).
let cache: { at: number; body: unknown } | null = null;
const TTL_MS = 60000;

// GET /api/sleeper/standings
// The Guillotine (chopped): this week's points, sorted low-to-high so the
// bottom of the table is on the block. Elimination starts in Week 1.
export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json(cache.body, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const leagueId = await choppedLeagueId();
    if (!leagueId) return NextResponse.json({ connected: false });

    const state = await getNflState();
    const week = Math.max(1, state?.week ?? 1);
    const isRegular = state?.season_type === "regular";
    const league = await getWeeklyStandings(leagueId, week);

    // A week is only final after its Monday-night game, which is when Sleeper
    // advances state.week - so the last COMPLETED week is week - 1.
    const lastCompletedWeek = isRegular ? Math.max(0, week - 1) : 0;
    const [eliminated, teams] = await Promise.all([
      lastCompletedWeek >= ELIMINATION_WEEK
        ? getEliminations(leagueId, lastCompletedWeek)
        : Promise.resolve([]),
      getLeagueTeams(leagueId, week),
    ]);

    // Estimated survival odds (chance a team is NOT the week's lowest score).
    const teamList = teams?.teams ?? [];
    const survivors = new Set(eliminated.map((e) => e.rosterId));
    const dists = teamList
      .filter((t) => !survivors.has(t.rosterId))
      .map(teamDistribution);
    const survive = dists.length > 1 ? survivalPct(dists) : new Map<number, number>();
    const teamsWithOdds = teamList.map((t) => ({
      ...t,
      survivePct: survive.get(t.rosterId) ?? null,
    }));

    const body = {
      connected: true,
      week,
      seasonType: state?.season_type ?? null,
      lastCompletedWeek,
      // Eliminations are live from Week 1 of the regular season.
      eliminationsLive: isRegular && week >= ELIMINATION_WEEK,
      eliminationWeek: ELIMINATION_WEEK,
      eliminated,
      teams: teamsWithOdds,
      league,
    };
    cache = { at: now, body };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/sleeper/standings]", err);
    return NextResponse.json({ error: "Failed to load standings." }, { status: 500 });
  }
}
