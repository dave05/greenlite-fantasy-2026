import { NextResponse } from "next/server";
import { getGazette, getNflState } from "@/lib/sleeper";
import { choppedLeagueId } from "@/lib/leagues";

export const dynamic = "force-dynamic";

// The paper only changes when a week finalises, so cache generously per week.
const cache = new Map<number, { at: number; body: unknown }>();
const TTL_MS = 10 * 60 * 1000;

// GET /api/gazette?week=<optional>
// The Guillotine Gazette: the weekly waiver roast, computed from Sleeper's
// public record. Defaults to the last COMPLETED week - the current week is
// still being played, and its waiver results are not final.
export async function GET(req: Request) {
  try {
    const leagueId = await choppedLeagueId();
    if (!leagueId) return NextResponse.json({ connected: false });

    const state = await getNflState();
    const current = Math.max(1, state?.week ?? 1);
    // Sleeper advances the NFL week after Monday night, so the last completed
    // week is current - 1 during the regular season.
    const lastCompleted =
      state?.season_type === "regular" ? Math.max(1, current - 1) : current;

    const asked = Number(new URL(req.url).searchParams.get("week"));
    const week = Number.isInteger(asked) && asked > 0 ? asked : lastCompleted;

    const hit = cache.get(week);
    if (hit && Date.now() - hit.at < TTL_MS) {
      return NextResponse.json(hit.body, { headers: { "Cache-Control": "no-store" } });
    }

    const gazette = await getGazette(leagueId, week);
    const body = { connected: true, week, lastCompleted, currentWeek: current, gazette };
    cache.set(week, { at: Date.now(), body });
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/gazette]", err);
    return NextResponse.json({ error: "Failed to load the Gazette." }, { status: 500 });
  }
}
