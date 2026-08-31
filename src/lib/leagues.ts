import { getConfig } from "./db";
import { getNflState, getUserByName, getUserLeagues } from "./sleeper";

// Display names for the two formats.
export const CHOPPED_NAME = "The Guillotine";
export const REGULAR_NAME = "The Country Club";

// Each league runs under its own commissioner, so each is looked up from its
// own public Sleeper username - no hard-coded league ids. Whichever of that
// commissioner's leagues matches the format's name pattern wins, newest season
// first. A new commissioner is a one-line change here.
export const GUILLOTINE_COMMISSIONER = "dawit21";
export const COUNTRY_CLUB_COMMISSIONER = "cheezychang";

// Both commissioners sit in other leagues too, so match on the league name
// rather than assuming they only run one.
const GUILLOTINE_PATTERN = /guillotine/i;
const COUNTRY_CLUB_PATTERN = /country\s*club/i;

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
// username -> league id hop per commissioner. Misses are cached briefly too, so
// a blip in the Sleeper API doesn't pin us to "not connected" for the full TTL.
const HIT_TTL_MS = 10 * 60 * 1000;
const MISS_TTL_MS = 60 * 1000;
const cache = new Map<string, { at: number; ttl: number; value: Discovered }>();

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

async function discoverLeague(
  commissioner: string,
  pattern: RegExp,
): Promise<Discovered> {
  const key = `${commissioner}|${pattern.source}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;

  let found: Discovered = null;
  const user = await getUserByName(commissioner);
  if (user) {
    for (const season of await seasonsNewestFirst()) {
      const leagues = await getUserLeagues(user.user_id, season);
      const match = (leagues ?? []).find((l) => pattern.test(l.name));
      if (match) {
        found = { leagueId: match.league_id, season: match.season };
        break;
      }
    }
  }

  cache.set(key, {
    at: Date.now(),
    ttl: found ? HIT_TTL_MS : MISS_TTL_MS,
    value: found,
  });
  return found;
}

// Drop the memoised lookups - call after a commissioner or league changes.
export function clearLeagueCache(): void {
  cache.clear();
}

/* ---------------------------- public resolvers ---------------------------- */

// Resolution order for either league:
//   1. The format's env var - an explicit pin, for when ops needs one.
//   2. That format's commissioner's newest matching league on Sleeper.
//   3. The legacy NAVY/MARINE env var or DB config, from before the redesign.
async function resolve(
  pinnedEnv: string | undefined,
  commissioner: string,
  pattern: RegExp,
  legacyEnv: string | undefined,
  legacyConfigKey: string,
): Promise<ResolvedLeague | null> {
  if (pinnedEnv) {
    return { leagueId: pinnedEnv, source: "env", commissioner: null, season: null };
  }

  const found = await discoverLeague(commissioner, pattern);
  if (found) {
    return {
      leagueId: found.leagueId,
      source: "commissioner",
      commissioner,
      season: found.season,
    };
  }

  const legacy = legacyEnv || (await getConfig(legacyConfigKey));
  if (legacy) {
    return { leagueId: legacy, source: "legacy", commissioner: null, season: null };
  }
  return null;
}

export function resolveChoppedLeague(): Promise<ResolvedLeague | null> {
  return resolve(
    process.env.SLEEPER_LEAGUE_CHOPPED,
    GUILLOTINE_COMMISSIONER,
    GUILLOTINE_PATTERN,
    process.env.SLEEPER_LEAGUE_NAVY,
    "sleeper_navy_id",
  );
}

export function resolveRegularLeague(): Promise<ResolvedLeague | null> {
  return resolve(
    process.env.SLEEPER_LEAGUE_REGULAR,
    COUNTRY_CLUB_COMMISSIONER,
    COUNTRY_CLUB_PATTERN,
    process.env.SLEEPER_LEAGUE_MARINE,
    "sleeper_marine_id",
  );
}

export async function choppedLeagueId(): Promise<string | null> {
  return (await resolveChoppedLeague())?.leagueId ?? null;
}

export async function regularLeagueId(): Promise<string | null> {
  return (await resolveRegularLeague())?.leagueId ?? null;
}
