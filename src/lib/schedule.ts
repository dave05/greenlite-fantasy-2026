// The week's Thursday Night Football game, from ESPN's public scoreboard. Used
// by the Gazette's kickoff section to name tonight's actual matchup ("SEA @ ARI
// kicks off Week 3 tonight"). Cached briefly so many viewers share one call.

export type TnfGame = {
  short: string; // "SEA @ ARI"
  away: string; // "Seattle Seahawks"
  home: string; // "Arizona Cardinals"
  kickoff: number; // epoch ms
};

type EspnCompetitor = {
  homeAway?: string;
  team?: { displayName?: string; abbreviation?: string };
};
type EspnEvent = {
  date?: string;
  shortName?: string;
  competitions?: { competitors?: EspnCompetitor[] }[];
};

const cache = new Map<string, { at: number; game: TnfGame | null }>();
const TTL_MS = 30 * 60 * 1000; // schedule barely moves; 30 min is plenty

// The Thursday game for a given regular-season week. Returns null if the week has
// no distinct Thursday opener (e.g. Week 18) or the fetch fails.
export async function getThursdayGame(
  week: number,
  seasonType = 2,
): Promise<TnfGame | null> {
  const key = `${seasonType}-${week}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.game;

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=${seasonType}&week=${week}`,
      { cache: "no-store", signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { events?: EspnEvent[] };
    const events = (data.events ?? [])
      .map((e) => ({ e, t: e.date ? Date.parse(e.date) : NaN }))
      .filter((x) => !Number.isNaN(x.t))
      .sort((a, b) => a.t - b.t);
    if (!events.length) {
      cache.set(key, { at: now, game: null });
      return null;
    }
    // TNF is the earliest kickoff of the week. Confirm it's actually a Thursday
    // (ET) so an all-Sunday week doesn't get mislabelled as a Thursday game.
    const first = events[0];
    const et = new Date(new Date(first.t).toLocaleString("en-US", { timeZone: "America/New_York" }));
    if (et.getDay() !== 4) {
      cache.set(key, { at: now, game: null });
      return null;
    }
    const comp = first.e.competitions?.[0];
    const away = comp?.competitors?.find((c) => c.homeAway === "away")?.team;
    const home = comp?.competitors?.find((c) => c.homeAway === "home")?.team;
    const game: TnfGame = {
      short: first.e.shortName ?? `${away?.abbreviation ?? "AWAY"} @ ${home?.abbreviation ?? "HOME"}`,
      away: away?.displayName ?? "the away team",
      home: home?.displayName ?? "the home team",
      kickoff: first.t,
    };
    cache.set(key, { at: now, game });
    return game;
  } catch {
    return null;
  }
}

// ESPN and Sleeper disagree on a couple of team codes; the site speaks Sleeper.
const ESPN_TO_SLEEPER: Record<string, string> = { WSH: "WAS" };

export type ByeTeam = { abbr: string; name: string };
const byeCache = new Map<string, { at: number; teams: ByeTeam[] }>();

// The NFL teams on bye in a given week, from the same ESPN scoreboard. A bye
// in a league where the lowest score is eliminated is a trap worth printing.
export async function getByeTeams(week: number, seasonType = 2): Promise<ByeTeam[]> {
  const key = `${seasonType}-${week}`;
  const now = Date.now();
  const hit = byeCache.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.teams;
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=${seasonType}&week=${week}`,
      { cache: "no-store", signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      week?: { teamsOnBye?: { abbreviation?: string; displayName?: string }[] };
    };
    const teams = (data.week?.teamsOnBye ?? [])
      .filter((t) => t.abbreviation)
      .map((t) => ({
        abbr: ESPN_TO_SLEEPER[t.abbreviation!] ?? t.abbreviation!,
        name: t.displayName ?? t.abbreviation!,
      }));
    byeCache.set(key, { at: now, teams });
    return teams;
  } catch {
    return [];
  }
}
