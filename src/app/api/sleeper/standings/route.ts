import { NextResponse } from "next/server";
import { ELIMINATION_WEEK, getCumulativeStandings, getNflState } from "@/lib/sleeper";
import { resolveChoppedLeague } from "@/lib/leagues";

export const dynamic = "force-dynamic";

// GET /api/sleeper/standings
// The Guillotine (chopped): cumulative season points, sorted low-to-high so the
// bottom of the table is on the block. Elimination starts in Week 2. The league
// is resolved from its own commissioner's Sleeper username unless env pins it.
export async function GET() {
  try {
    const resolved = await resolveChoppedLeague();
    if (!resolved) return NextResponse.json({ connected: false });
    const leagueId = resolved.leagueId;

    const state = await getNflState();
    const league = await getCumulativeStandings(leagueId);
    const week = Math.max(1, state?.week ?? 1);
    const isRegular = state?.season_type === "regular";

    return NextResponse.json(
      {
        connected: true,
        week,
        seasonType: state?.season_type ?? null,
        // Eliminations are live only once the regular season reaches Week 2.
        eliminationsLive: isRegular && week >= ELIMINATION_WEEK,
        eliminationWeek: ELIMINATION_WEEK,
        // Where this league id came from, so a stale pull is obvious.
        source: resolved.source,
        commissioner: resolved.commissioner,
        leagueSeason: resolved.season,
        league,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/sleeper/standings]", err);
    return NextResponse.json({ error: "Failed to load standings." }, { status: 500 });
  }
}
