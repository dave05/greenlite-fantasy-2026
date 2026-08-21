import { NextResponse } from "next/server";
import { ELIMINATION_WEEK, getCumulativeStandings, getNflState } from "@/lib/sleeper";
import { choppedLeagueId } from "@/lib/leagues";

export const dynamic = "force-dynamic";

// GET /api/sleeper/standings
// The Guillotine (chopped): cumulative season points, sorted low-to-high so the
// bottom of the table is on the block. Elimination starts in Week 2.
export async function GET() {
  try {
    const leagueId = await choppedLeagueId();
    if (!leagueId) return NextResponse.json({ connected: false });

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
        league,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/sleeper/standings]", err);
    return NextResponse.json({ error: "Failed to load standings." }, { status: 500 });
  }
}
