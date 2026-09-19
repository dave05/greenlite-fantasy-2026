import { NextResponse } from "next/server";
import { getLeagueTransactions, getNflState } from "@/lib/sleeper";
import { choppedLeagueId, regularLeagueId } from "@/lib/leagues";

export const dynamic = "force-dynamic";

// Waiver / free-agent / FAAB activity moves slowly - cache generously.
let cache: { at: number; body: unknown } | null = null;
const TTL_MS = 5 * 60 * 1000;

// GET /api/sleeper/transactions
// Recent waiver/FAAB activity + FAAB budget status for both leagues.
export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json(cache.body, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const state = await getNflState();
    const week = Math.max(1, state?.week ?? 1);
    const [choppedId, regularId] = await Promise.all([
      choppedLeagueId(),
      regularLeagueId(),
    ]);
    const [guillotine, countryclub] = await Promise.all([
      choppedId ? getLeagueTransactions(choppedId, week) : Promise.resolve(null),
      regularId ? getLeagueTransactions(regularId, week) : Promise.resolve(null),
    ]);

    const body = { connected: true, week, guillotine, countryclub };
    cache = { at: now, body };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/sleeper/transactions]", err);
    return NextResponse.json({ error: "Failed to load transactions." }, { status: 500 });
  }
}
