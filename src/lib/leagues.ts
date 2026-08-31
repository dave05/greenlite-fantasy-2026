import { getConfig } from "./db";
import { getNflState, getUserByName, getUserLeagues } from "./sleeper";

// Display names for the two formats.
export const CHOPPED_NAME = "The Guillotine";
export const REGULAR_NAME = "The Country Club";

// The Country Club's commissioner on Sleeper. The league id isn't hard-coded:
// we look up this public username and pull whichever of their leagues is The
// Country Club, newest season first. A new commissioner is a one-line change
// here - no redeploy of env vars needed.
export const COUNTRY_CLUB_COMMISSIONER = "cheezychang";

// Matches "⛳ The Country Club", "Country Club 2026", etc.
const COUNTRY_CLUB_PATTERN = /country\s*club/i;

// Which Sleeper league runs the chopped format. Prefer the new env var; fall
// back to the old NAVY var (and DB config) so nothing breaks mid-migration.
export async function choppedLeagueId(): Promise<string | null> {
  return (
    process.env.SLEEPER_LEAGUE_CHOPPED ||
    process.env.SLEEPER_LEAGUE_NAVY ||
    (await getConfig("sleeper_navy_id")) ||
    null
  );
}

export type LeagueSource = "env" | "commissioner" | "legacy";

export type ResolvedLeague = {
  leagueId: string;
  source: LeagueSource;
  commissioner: string | null;
  season: string | null;
};

/* ------------------------- commissioner lookup ---------------------------- */

type Discovered = { leagueId: string; season: string } | null;

// Sleeper's public API is unauthenticated and rate-limited, so cache the
// username -> league id hop. Misses are cached briefly too, so a blip in the
// Sleeper API doesn't pin us to "not connected" for the full TTL.
const HIT_TTL_MS = 10 * 60 * 1000;
const MISS_TTL_MS = 60 * 1000;
let cache: { at: number; ttl: number; value: Discovered } | null = null;

// Newest season first: `league_season` is the season Sleeper is currently
// creating leagues for, then the in-progress season, then last year (so the
// board still resolves in the offseason gap before leagues roll over).
async function seasonsNewestFirst(): Promise<string[]> {
  const state = await getNflState();
  const seasons = [
    state?.league_season,
    state?.season,
    state?.previous_season,
  ].filter((s): s is string => Boolean(s));
  if (seasons.length === 0) seasons.push(String(new Date().getFullYear()));
  return [...new Set(seasons)];
}

async function discoverCountryClub(): Promise<Discovered> {
  if (cache && Date.now() - cache.at < cache.ttl) return cache.value;

  let found: Discovered = null;
  const user = await getUserByName(COUNTRY_CLUB_COMMISSIONER);
  if (user) {
    for (const season of await seasonsNewestFirst()) {
      const leagues = await getUserLeagues(user.user_id, season);
      const match = (leagues ?? []).find((l) => COUNTRY_CLUB_PATTERN.test(l.name));
      if (match) {
        found = { leagueId: match.league_id, season: match.season };
        break;
      }
    }
  }

  cache = { at: Date.now(), ttl: found ? HIT_TTL_MS : MISS_TTL_MS, value: found };
  return found;
}

// Drop the memoised lookup - call after the commissioner or league changes.
export function clearCountryClubCache(): void {
  cache = null;
}

/* ---------------------------- public resolver ----------------------------- */

// The Country Club league, in priority order:
//   1. SLEEPER_LEAGUE_REGULAR - an explicit pin, for when ops needs one.
//   2. The commissioner's newest Country Club league on Sleeper.
//   3. Legacy MARINE env var / DB config, from before the two-league redesign.
export async function resolveRegularLeague(): Promise<ResolvedLeague | null> {
  const pinned = process.env.SLEEPER_LEAGUE_REGULAR;
  if (pinned) {
    return { leagueId: pinned, source: "env", commissioner: null, season: null };
  }

  const found = await discoverCountryClub();
  if (found) {
    return {
      leagueId: found.leagueId,
      source: "commissioner",
      commissioner: COUNTRY_CLUB_COMMISSIONER,
      season: found.season,
    };
  }

  const legacy =
    process.env.SLEEPER_LEAGUE_MARINE || (await getConfig("sleeper_marine_id"));
  if (legacy) {
    return { leagueId: legacy, source: "legacy", commissioner: null, season: null };
  }
  return null;
}

export async function regularLeagueId(): Promise<string | null> {
  return (await resolveRegularLeague())?.leagueId ?? null;
}
