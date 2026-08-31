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
  // The season Sleeper is creating leagues for (ahead of `season` in the
  // offseason), and the one just finished.
  league_season?: string;
  previous_season?: string;
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
  // Sleeper flags the commissioner (league owner) with is_owner.
  is_owner?: boolean | null;
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

export type SleeperDraft = {
  draft_id: string;
  status: string; // pre_draft | drafting | paused | complete
  type: string; // snake | linear | auction
  start_time: number | null;
  last_picked: number | null;
  created: number | null;
  draft_order?: Record<string, number> | null; // user_id -> draft slot
  slot_to_roster_id?: Record<string, number> | null;
  settings?: Record<string, number> | null;
};

export type SleeperDraftPick = {
  round: number;
  pick_no: number;
  draft_slot: number;
  roster_id: number | null;
  picked_by: string | null;
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
export const getLeagueDrafts = (leagueId: string) =>
  get<SleeperDraft[]>(`/league/${leagueId}/drafts`);
export const getDraftPicks = (draftId: string) =>
  get<SleeperDraftPick[]>(`/draft/${draftId}/picks`);

export type SleeperMember = {
  userId: string;
  handle: string;
  team: string | null;
  avatar: string | null;
  isCommissioner: boolean;
};

function buildMembers(users: SleeperLeagueUser[] | null): SleeperMember[] {
  return (users ?? [])
    .map((u) => ({
      userId: u.user_id,
      handle: u.display_name,
      team: u.metadata?.team_name?.trim() || null,
      avatar: u.avatar ?? null,
      isCommissioner: u.is_owner === true,
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

/* ------------------------------ draft clock ------------------------------- */

export type RoundClock = {
  round: number;
  state: "complete" | "live" | "upcoming";
  // Epoch ms this round is expected to end: exact for the live round's own
  // deadline chain, an estimate (every remaining pick using its full timer)
  // for later rounds. Null when the draft is untimed or not running.
  endsAt: number | null;
  picksMade: number;
  picksTotal: number;
};

export type DraftClock = {
  draftId: string;
  status: string; // pre_draft | drafting | paused | complete
  type: string; // snake | linear | auction
  rounds: number;
  teams: number;
  pickTimerSec: number; // 0 = no timer configured
  picksMade: number;
  totalPicks: number;
  currentRound: number | null;
  pickInRound: number | null;
  overallPick: number | null;
  // Epoch ms the pick on the clock expires. The client counts down from this
  // so the timer ticks smoothly between polls.
  pickDeadline: number | null;
  onTheClock: {
    slot: number;
    rosterId: number | null;
    team: string | null;
    handle: string | null;
    avatar: string | null;
  } | null;
  roundClocks: RoundClock[];
};

// Which draft slot picks at (round, pickInRound). Snake drafts reverse on even
// rounds; linear drafts always run 1..N. `reversal_round` (3rd-round reversal)
// flips the pattern from that round on.
function slotForPick(
  type: string,
  teams: number,
  round: number,
  pickInRound: number,
  reversalRound: number,
): number {
  if (type !== "snake") return pickInRound;
  let reversed = round % 2 === 0;
  if (reversalRound > 0 && round >= reversalRound) reversed = !reversed;
  return reversed ? teams - pickInRound + 1 : pickInRound;
}

// Live draft state for a league: who is on the clock, how long they have left,
// and the projected end of each round. Everything is derived from Sleeper's
// public draft endpoints - no auth, so it works for any member of the league.
export async function getDraftClock(leagueId: string): Promise<DraftClock | null> {
  const drafts = await getLeagueDrafts(leagueId);
  // A league can carry old drafts; take the most recently created one.
  const draft = (drafts ?? [])
    .slice()
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];
  if (!draft) return null;

  const [picks, users] = await Promise.all([
    getDraftPicks(draft.draft_id),
    getLeagueUsers(leagueId),
  ]);

  const st = draft.settings ?? {};
  const rounds = st.rounds ?? 0;
  const teams = st.teams ?? 0;
  const pickTimerSec = st.pick_timer ?? 0;
  const reversalRound = st.reversal_round ?? 0;
  const totalPicks = rounds * teams;
  const picksMade = (picks ?? []).length;

  const running = draft.status === "drafting" || draft.status === "paused";
  const done = picksMade >= totalPicks && totalPicks > 0;

  const overallPick = running && !done ? picksMade + 1 : null;
  const currentRound =
    overallPick && teams > 0 ? Math.floor((overallPick - 1) / teams) + 1 : null;
  const pickInRound =
    overallPick && currentRound && teams > 0
      ? overallPick - (currentRound - 1) * teams
      : null;

  // The clock started when the last pick landed (or when the draft opened).
  // A paused draft has no meaningful deadline - Sleeper freezes the timer.
  const clockStart = draft.last_picked || draft.start_time || null;
  const pickDeadline =
    draft.status === "drafting" && pickTimerSec > 0 && clockStart && overallPick
      ? clockStart + pickTimerSec * 1000
      : null;

  // On the clock: map the pick to a draft slot, the slot back to its manager.
  let onTheClock: DraftClock["onTheClock"] = null;
  if (currentRound && pickInRound && teams > 0) {
    const slot = slotForPick(draft.type, teams, currentRound, pickInRound, reversalRound);
    const userBySlot = new Map<number, string>();
    for (const [userId, s] of Object.entries(draft.draft_order ?? {})) {
      userBySlot.set(s, userId);
    }
    const userId = userBySlot.get(slot) ?? null;
    const u = userId ? (users ?? []).find((x) => x.user_id === userId) : undefined;
    onTheClock = {
      slot,
      rosterId: draft.slot_to_roster_id?.[String(slot)] ?? null,
      team: u?.metadata?.team_name?.trim() || null,
      handle: u?.display_name ?? null,
      avatar: u?.avatar ?? null,
    };
  }

  // Per-round clocks. The live round ends after its remaining picks each burn
  // the full timer; every later round is that plus a full round of picks.
  const roundList: RoundClock[] = [];
  const roundMs = teams * pickTimerSec * 1000;
  const liveRoundEnd =
    pickDeadline && pickInRound
      ? pickDeadline + (teams - pickInRound) * pickTimerSec * 1000
      : null;

  for (let r = 1; r <= rounds; r++) {
    const madeInRound = Math.min(Math.max(picksMade - (r - 1) * teams, 0), teams);
    let state: RoundClock["state"] = "upcoming";
    if (currentRound == null) state = done ? "complete" : "upcoming";
    else if (r < currentRound) state = "complete";
    else if (r === currentRound) state = "live";

    let endsAt: number | null = null;
    if (state === "live") endsAt = liveRoundEnd;
    else if (state === "upcoming" && liveRoundEnd && currentRound)
      endsAt = liveRoundEnd + (r - currentRound) * roundMs;

    roundList.push({
      round: r,
      state,
      endsAt,
      picksMade: madeInRound,
      picksTotal: teams,
    });
  }

  return {
    draftId: draft.draft_id,
    status: draft.status,
    type: draft.type,
    rounds,
    teams,
    pickTimerSec,
    picksMade,
    totalPicks,
    currentRound,
    pickInRound,
    overallPick,
    pickDeadline,
    onTheClock,
    roundClocks: roundList,
  };
}
