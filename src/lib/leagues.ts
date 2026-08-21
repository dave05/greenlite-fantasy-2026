import { getConfig } from "./db";

// Which Sleeper league runs which format. Prefer the new env vars; fall back to
// the old NAVY/MARINE vars (and DB config) so nothing breaks mid-migration.
export async function choppedLeagueId(): Promise<string | null> {
  return (
    process.env.SLEEPER_LEAGUE_CHOPPED ||
    process.env.SLEEPER_LEAGUE_NAVY ||
    (await getConfig("sleeper_navy_id")) ||
    null
  );
}

export async function regularLeagueId(): Promise<string | null> {
  return (
    process.env.SLEEPER_LEAGUE_REGULAR ||
    process.env.SLEEPER_LEAGUE_MARINE ||
    (await getConfig("sleeper_marine_id")) ||
    null
  );
}

// Display names for the two formats.
export const CHOPPED_NAME = "The Guillotine";
export const REGULAR_NAME = "The Country Club";
