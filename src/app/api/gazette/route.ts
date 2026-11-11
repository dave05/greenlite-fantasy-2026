import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getGazette, getNflState } from "@/lib/sleeper";
import { getThursdayGame } from "@/lib/schedule";
import { choppedLeagueId } from "@/lib/leagues";

export const dynamic = "force-dynamic";

// The paper only changes when a week finalises, so cache generously per week.
const cache = new Map<number, { at: number; body: unknown }>();
const TTL_MS = 10 * 60 * 1000;

// The editor routine commits curated jokes to public/league-copy/week-N.json.
// Read it off the function's filesystem (next.config bundles these files into
// this route via outputFileTracingIncludes) rather than over HTTP - a same-origin
// fetch of a public asset is unreliable under deployment protection / internal
// routing. Returns the `paper` object, or null if no curated copy exists yet.
async function loadCuratedCopy(week: number): Promise<unknown> {
  try {
    const path = join(process.cwd(), "public", "league-copy", `week-${week}.json`);
    const raw = await readFile(path, "utf8");
    const json = JSON.parse(raw) as { paper?: unknown } | null;
    return json?.paper ?? json ?? null;
  } catch {
    return null;
  }
}

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
    // Tonight's TNF matchup for the upcoming week, for the kickoff section.
    const tnf =
      state?.season_type === "regular"
        ? await getThursdayGame(current).catch(() => null)
        : null;
    // Curated copy for this week, if the weekly editor routine has written and
    // pushed one. It is a committed static asset at public/league-copy/week-N.json
    // ({ week, paper: {...} }); when present, Gazette.tsx renders these hand-
    // written, web-researched, no-repeat jokes instead of the auto-generated
    // lines. Same file the no-repeat checker (scripts/roast/memory.mjs) reads, so
    // the site and the guard never disagree. Absent = the deterministic fallback.
    const copy = await loadCuratedCopy(week);
    const body = { connected: true, week, lastCompleted, currentWeek: current, tnf, gazette, copy };
    cache.set(week, { at: Date.now(), body });
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/gazette]", err);
    return NextResponse.json({ error: "Failed to load the Gazette." }, { status: 500 });
  }
}
