import { NextResponse } from "next/server";
import { DRAFT_FALLBACK_START, getDraftState } from "@/lib/sleeper";
import { choppedLeagueId, regularLeagueId } from "@/lib/leagues";

export const dynamic = "force-dynamic";

// Short in-memory cache: many viewers polling during the draft share one Sleeper
// fetch instead of each triggering a full refetch. Fluid Compute reuses the
// instance, so this holds across requests and slashes Active CPU on busy days.
let cache: { at: number; body: unknown } | null = null;
const TTL_MS = 25000;

// GET /api/sleeper/draft
// Draft state for both leagues: schedule/countdown, plus who's on the clock and
// on deck once a draft goes live. All read live from Sleeper.
export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json(cache.body, {
      headers: { "Cache-Control": "no-store", "x-cache": "hit" },
    });
  }
  try {
    const [choppedId, regularId] = await Promise.all([
      choppedLeagueId(),
      regularLeagueId(),
    ]);
    const [guillotine, countryclub] = await Promise.all([
      choppedId ? getDraftState(choppedId) : Promise.resolve(null),
      regularId ? getDraftState(regularId) : Promise.resolve(null),
    ]);

    const drafts = [
      guillotine && {
        league: "guillotine",
        name: "The Guillotine",
        emoji: "🪓",
        accent: "#ef4444",
        ...guillotine,
        // Fall back to the scheduled time if a league hasn't set one on Sleeper.
        startTime: guillotine.startTime ?? DRAFT_FALLBACK_START,
      },
      countryclub && {
        league: "countryclub",
        name: "The Country Club",
        emoji: "⛳",
        accent: "#34d17a",
        ...countryclub,
        startTime: countryclub.startTime ?? DRAFT_FALLBACK_START,
      },
    ].filter(Boolean);

    const body = { connected: true, drafts };
    cache = { at: now, body };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/sleeper/draft]", err);
    return NextResponse.json({ error: "Failed to load draft." }, { status: 500 });
  }
}
