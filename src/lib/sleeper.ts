// Thin client for Sleeper's public, read-only API (https://docs.sleeper.com).
// No auth or API key - everything is keyed off a public username / league id.

const BASE = "https://api.sleeper.app/v1";

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type SleeperState = {
  week: number;
  display_week: number;
  season: string;
  season_type: string;
};

export type SleeperUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
};

export type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  status: string;
  avatar: string | null;
  roster_positions?: string[] | null;
  settings?: Record<string, number> | null;
  scoring_settings?: Record<string, number> | null;
};

export type LeagueSettings = {
  starters: string[];
  benchCount: number;
  ppr: number;
  passTd: number;
  playoffWeekStart: number | null;
  playoffTeams: number | null;
  faabBudget: number | null;
  tradeDeadline: number | null;
  tradesDisabled: boolean;
  maxKeepers: number | null;
};

function parseSettings(l: SleeperLeague): LeagueSettings {
  const rp = l.roster_positions ?? [];
  const s = l.settings ?? {};
  const sc = l.scoring_settings ?? {};
  return {
    starters: rp.filter((p) => !["BN", "IR", "TAXI"].includes(p)),
    benchCount: rp.filter((p) => p === "BN").length,
    ppr: sc.rec ?? 0,
    passTd: sc.pass_td ?? 0,
    playoffWeekStart: s.playoff_week_start ?? null,
    playoffTeams: s.playoff_teams ?? null,
    faabBudget: s.waiver_budget ?? null,
    tradeDeadline: s.trade_deadline ?? null,
    tradesDisabled: (s.disable_trades ?? 0) === 1,
    maxKeepers: s.max_keepers ?? null,
  };
}

export type SleeperLeagueUser = {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: { team_name?: string } | null;
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  settings?: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
    fpts_against?: number;
  } | null;
};

export type SleeperMatchup = {
  roster_id: number;
  points: number | null;
  matchup_id: number | null;
};

export const getNflState = () => get<SleeperState>(`/state/nfl`);
export const getUserByName = (username: string) =>
  get<SleeperUser>(`/user/${encodeURIComponent(username)}`);
export const getUserLeagues = (userId: string, season: string) =>
  get<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`);
export const getLeague = (leagueId: string) =>
  get<SleeperLeague>(`/league/${leagueId}`);
export const getLeagueUsers = (leagueId: string) =>
  get<SleeperLeagueUser[]>(`/league/${leagueId}/users`);
export const getRosters = (leagueId: string) =>
  get<SleeperRoster[]>(`/league/${leagueId}/rosters`);
export const getMatchups = (leagueId: string, week: number) =>
  get<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`);

export type SleeperMember = {
  userId: string;
  handle: string;
  team: string | null;
  avatar: string | null;
};

function buildMembers(users: SleeperLeagueUser[] | null): SleeperMember[] {
  return (users ?? [])
    .map((u) => ({
      userId: u.user_id,
      handle: u.display_name,
      team: u.metadata?.team_name?.trim() || null,
      avatar: u.avatar ?? null,
    }))
    .sort((a, b) => (a.team ?? a.handle).localeCompare(b.team ?? b.handle));
}

function teamName(
  roster: SleeperRoster,
  userById: Map<string, SleeperLeagueUser>,
): string {
  const u = roster.owner_id ? userById.get(roster.owner_id) : undefined;
  return (
    u?.metadata?.team_name?.trim() || u?.display_name || `Roster ${roster.roster_id}`
  );
}

export type Standing = {
  rosterId: number;
  name: string;
  points: number;
  played: boolean;
};

// Weekly standings for one league: each roster's points this week, sorted
// ascending so the lowest scorer (this format's weekly chop) is first.
export async function getLeagueStandings(
  leagueId: string,
  week: number,
): Promise<{
  leagueId: string;
  leagueName: string;
  status: string | null;
  standings: Standing[];
} | null> {
  const [league, users, rosters, matchups] = await Promise.all([
    getLeague(leagueId),
    getLeagueUsers(leagueId),
    getRosters(leagueId),
    getMatchups(leagueId, week),
  ]);
  // A brand-new pre-draft league can have no rosters yet - treat that as empty
  // standings (the UI shows a pre-draft placeholder) rather than a hard failure.
  const rosterList = rosters ?? [];

  const userById = new Map((users ?? []).map((u) => [u.user_id, u]));
  const ptsByRoster = new Map(
    (matchups ?? []).map((m) => [m.roster_id, m.points]),
  );

  const standings: Standing[] = rosterList
    .map((r) => {
      const u = r.owner_id ? userById.get(r.owner_id) : undefined;
      const name =
        u?.metadata?.team_name?.trim() ||
        u?.display_name ||
        `Roster ${r.roster_id}`;
      const raw = ptsByRoster.get(r.roster_id);
      return {
        rosterId: r.roster_id,
        name,
        points: raw ?? 0,
        played: raw != null && raw > 0,
      };
    })
    .sort((a, b) => a.points - b.points);

  return {
    leagueId,
    leagueName: league?.name ?? "League",
    status: league?.status ?? null,
    standings,
  };
}

// The Guillotine standings: CUMULATIVE season points (roster fpts), sorted
// low-to-high so the bottom of the table is on the chopping block. Elimination
// begins in Week 2.
export const ELIMINATION_WEEK = 2;

export async function getCumulativeStandings(leagueId: string): Promise<{
  leagueId: string;
  leagueName: string;
  status: string | null;
  settings: LeagueSettings | null;
  members: SleeperMember[];
  totalTeams: number;
  standings: Standing[];
} | null> {
  const [league, users, rosters] = await Promise.all([
    getLeague(leagueId),
    getLeagueUsers(leagueId),
    getRosters(leagueId),
  ]);
  const userById = new Map((users ?? []).map((u) => [u.user_id, u]));
  const standings: Standing[] = (rosters ?? [])
    .map((r) => {
      const s = r.settings ?? {};
      const total = (s.fpts ?? 0) + (s.fpts_decimal ?? 0) / 100;
      return {
        rosterId: r.roster_id,
        name: teamName(r, userById),
        points: total,
        played: total > 0,
      };
    })
    .sort((a, b) => a.points - b.points);

  return {
    leagueId,
    leagueName: league?.name ?? "League",
    status: league?.status ?? null,
    settings: league ? parseSettings(league) : null,
    members: buildMembers(users),
    totalTeams: league?.total_rosters ?? (rosters ?? []).length,
    standings,
  };
}

/* --------------------- regular head-to-head league ------------------------ */

export type MatchupTeam = {
  rosterId: number;
  name: string;
  points: number;
  played: boolean;
};
export type Matchup = { matchupId: number; teams: MatchupTeam[] };

// Weekly head-to-head scoreboard: rosters that share a matchup_id play each
// other. Returns one entry per matchup, teams sorted high-to-low.
export async function getWeeklyMatchups(
  leagueId: string,
  week: number,
): Promise<{
  leagueId: string;
  leagueName: string;
  status: string | null;
  settings: LeagueSettings | null;
  members: SleeperMember[];
  totalTeams: number;
  week: number;
  matchups: Matchup[];
} | null> {
  const [league, users, rosters, matchups] = await Promise.all([
    getLeague(leagueId),
    getLeagueUsers(leagueId),
    getRosters(leagueId),
    getMatchups(leagueId, week),
  ]);
  const userById = new Map((users ?? []).map((u) => [u.user_id, u]));
  const rosterById = new Map((rosters ?? []).map((r) => [r.roster_id, r]));

  const groups = new Map<number, MatchupTeam[]>();
  for (const m of matchups ?? []) {
    if (m.matchup_id == null) continue;
    const r = rosterById.get(m.roster_id);
    const team: MatchupTeam = {
      rosterId: m.roster_id,
      name: r ? teamName(r, userById) : `Roster ${m.roster_id}`,
      points: m.points ?? 0,
      played: m.points != null && m.points > 0,
    };
    const arr = groups.get(m.matchup_id) ?? [];
    arr.push(team);
    groups.set(m.matchup_id, arr);
  }
  const matchupList: Matchup[] = [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, teams]) => ({
      matchupId: id,
      teams: teams.sort((a, b) => b.points - a.points),
    }));

  return {
    leagueId,
    leagueName: league?.name ?? "League",
    status: league?.status ?? null,
    settings: league ? parseSettings(league) : null,
    members: buildMembers(users),
    totalTeams: league?.total_rosters ?? (rosters ?? []).length,
    week,
    matchups: matchupList,
  };
}

export type SeasonRow = {
  rosterId: number;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
};

// Season standings from roster records (wins/losses/ties + points for),
// sorted by wins, then points for.
export async function getSeasonStandings(leagueId: string): Promise<{
  leagueId: string;
  leagueName: string;
  status: string | null;
  rows: SeasonRow[];
} | null> {
  const [league, users, rosters] = await Promise.all([
    getLeague(leagueId),
    getLeagueUsers(leagueId),
    getRosters(leagueId),
  ]);
  const userById = new Map((users ?? []).map((u) => [u.user_id, u]));
  const rows: SeasonRow[] = (rosters ?? [])
    .map((r) => {
      const s = r.settings ?? {};
      const pointsFor = (s.fpts ?? 0) + (s.fpts_decimal ?? 0) / 100;
      return {
        rosterId: r.roster_id,
        name: teamName(r, userById),
        wins: s.wins ?? 0,
        losses: s.losses ?? 0,
        ties: s.ties ?? 0,
        pointsFor,
      };
    })
    .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);

  return {
    leagueId,
    leagueName: league?.name ?? "League",
    status: league?.status ?? null,
    rows,
  };
}
