import { NextResponse } from "next/server";
import { getNflState, getSeasonStandings, getWeeklyMatchups } from "@/lib/sleeper";
import { regularLeagueId } from "@/lib/leagues";

export const dynamic = "force-dynamic";

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

    const [matchups, season] = await Promise.all([
      getWeeklyMatchups(leagueId, week),
      getSeasonStandings(leagueId),
    ]);

    return NextResponse.json(
      {
        connected: true,
        week,
        seasonType: state?.season_type ?? null,
        matchups,
        season,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/sleeper/matchups]", err);
    return NextResponse.json({ error: "Failed to load matchups." }, { status: 500 });
  }
}
