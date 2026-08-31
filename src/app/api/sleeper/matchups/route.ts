import { NextResponse } from "next/server";
import {
  getDraftClock,
  getNflState,
  getSeasonStandings,
  getWeeklyMatchups,
} from "@/lib/sleeper";
import { resolveRegularLeague } from "@/lib/leagues";

export const dynamic = "force-dynamic";

// GET /api/sleeper/matchups?week=<optional>
// The Country Club (regular) league: weekly head-to-head scoreboard + season
// standings. The league itself is resolved from the commissioner's Sleeper
// username (newest season first) unless an env var pins it.
export async function GET(req: Request) {
  try {
    const league = await resolveRegularLeague();
    if (!league) return NextResponse.json({ connected: false });
    const leagueId = league.leagueId;

    const state = await getNflState();
    const { searchParams } = new URL(req.url);
    const weekOverride = Number(searchParams.get("week"));
    const week =
      Number.isFinite(weekOverride) && weekOverride > 0
        ? weekOverride
        : Math.max(1, state?.week ?? 1);

    const [matchups, season, draft] = await Promise.all([
      getWeeklyMatchups(leagueId, week),
      getSeasonStandings(leagueId),
      getDraftClock(leagueId),
    ]);

    return NextResponse.json(
      {
        connected: true,
        week,
        seasonType: state?.season_type ?? null,
        // Where this league id came from, so a stale pull is obvious.
        source: league.source,
        commissioner: league.commissioner,
        leagueSeason: league.season,
        matchups,
        season,
        draft,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/sleeper/matchups]", err);
    return NextResponse.json({ error: "Failed to load matchups." }, { status: 500 });
  }
}
