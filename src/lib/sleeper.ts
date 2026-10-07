// Thin client for Sleeper's public, read-only API (https://docs.sleeper.com).
// No auth or API key - everything is keyed off a public username / league id.

import { getHeadlines, classify, type NewsCategory } from "./news";

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
    // Only a FAAB league (waiver_type 2) actually has a budget; rolling-waiver
    // leagues report a leftover waiver_budget we should ignore.
    faabBudget: (s.waiver_type ?? 0) === 2 ? s.waiver_budget ?? null : null,
    tradeDeadline: s.trade_deadline ?? null,
    tradesDisabled: (s.disable_trades ?? 0) === 1,
    maxKeepers: s.max_keepers ?? null,
  };
}

export type SleeperLeagueUser = {
  user_id: string;
  display_name: string;
  avatar: string | null;
  // A custom team avatar is a full URL under metadata.avatar; the top-level
  // `avatar` is instead an id served from sleepercdn.
  metadata?: { team_name?: string; avatar?: string } | null;
};

// Resolve a user's best avatar to a full image URL, or null if they have none.
export function avatarUrl(user: SleeperLeagueUser | undefined): string | null {
  if (!user) return null;
  const custom = user.metadata?.avatar?.trim();
  if (custom) return custom;
  if (user.avatar) return `https://sleepercdn.com/avatars/thumbs/${user.avatar}`;
  return null;
}

export type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  players?: string[] | null;
  starters?: string[] | null;
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
  // Per-player scoring and the started lineup. Needed to judge whether an
  // expensive waiver pickup actually delivered, and whether they even played him.
  players_points?: Record<string, number> | null;
  starters?: string[] | null;
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

// The Guillotine standings: THIS WEEK'S points, sorted low-to-high so the
// bottom of the table is on the chopping block. The chop starts in Week 1 and
// continues every week until one team is left standing - that survivor wins.
export const ELIMINATION_WEEK = 1;

export async function getWeeklyStandings(
  leagueId: string,
  week: number,
): Promise<{
  leagueId: string;
  leagueName: string;
  status: string | null;
  settings: LeagueSettings | null;
  members: SleeperMember[];
  totalTeams: number;
  standings: Standing[];
} | null> {
  const [league, users, rosters, matchups] = await Promise.all([
    getLeague(leagueId),
    getLeagueUsers(leagueId),
    getRosters(leagueId),
    getMatchups(leagueId, week),
  ]);
  const userById = new Map((users ?? []).map((u) => [u.user_id, u]));
  const ptsByRoster = new Map(
    (matchups ?? []).map((m) => [m.roster_id, m.points]),
  );
  const standings: Standing[] = (rosters ?? [])
    .map((r) => {
      const raw = ptsByRoster.get(r.roster_id);
      return {
        rosterId: r.roster_id,
        name: teamName(r, userById),
        points: raw ?? 0,
        played: raw != null && raw > 0,
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

// A team the Guillotine has already chopped, with the week it went out.
export type Eliminated = {
  week: number;
  rosterId: number;
  name: string;
  points: number; // that week's score, the one that got them chopped
  avatar: string | null; // owner's Sleeper avatar, for the obituary portrait
};

// Reconstruct the graveyard deterministically from Sleeper's weekly scores.
// Rule: from Week 1, at the end of each COMPLETED week the surviving team with
// the lowest score THAT WEEK is chopped - every week until one team is left
// standing. `lastCompletedWeek` is state.week-1, so a week only counts once its
// Monday-night game is final (Sleeper advances the NFL week after MNF).
// Earliest elimination first.
export async function getEliminations(
  leagueId: string,
  lastCompletedWeek: number,
): Promise<Eliminated[]> {
  if (lastCompletedWeek < ELIMINATION_WEEK) return [];

  const [users, rosters] = await Promise.all([
    getLeagueUsers(leagueId),
    getRosters(leagueId),
  ]);
  const userById = new Map((users ?? []).map((u) => [u.user_id, u]));
  // Only claimed rosters are real teams - unclaimed slots never "compete".
  const claimed = (rosters ?? []).filter((r) => r.owner_id);
  if (claimed.length <= 1) return [];

  const weeks = Array.from({ length: lastCompletedWeek }, (_, i) => i + 1);
  const weekly = await Promise.all(weeks.map((w) => getMatchups(leagueId, w)));
  const pointsByWeek = weekly.map(
    (ms) => new Map((ms ?? []).map((m) => [m.roster_id, m.points ?? 0])),
  );

  const survivors = new Set(claimed.map((r) => r.roster_id));
  const nameById = new Map(claimed.map((r) => [r.roster_id, teamName(r, userById)]));
  const avatarById = new Map(
    claimed.map((r) => [r.roster_id, avatarUrl(r.owner_id ? userById.get(r.owner_id) : undefined)]),
  );
  const eliminated: Eliminated[] = [];

  for (let w = 1; w <= lastCompletedWeek; w++) {
    const wk = pointsByWeek[w - 1];
    if (w >= ELIMINATION_WEEK && survivors.size > 1) {
      let outId: number | null = null;
      let low = Infinity;
      for (const rid of survivors) {
        const p = wk.get(rid) ?? 0;
        if (p < low) {
          low = p;
          outId = rid;
        }
      }
      if (outId != null) {
        eliminated.push({
          week: w,
          rosterId: outId,
          name: nameById.get(outId) ?? `Roster ${outId}`,
          points: low,
          avatar: avatarById.get(outId) ?? null,
        });
        survivors.delete(outId);
      }
    }
  }
  return eliminated;
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
  teams: { rosterId: number; name: string }[];
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

  // Actual rostered teams (claimed rosters only). A commissioner who joined the
  // league without taking a roster is NOT a team, so we key off owner_id - not
  // the users list, which would count non-playing members.
  const teams = (rosters ?? [])
    .filter((r) => r.owner_id)
    .map((r) => ({ rosterId: r.roster_id, name: teamName(r, userById) }))
    .filter((t) => !/^Roster \d+$/.test(t.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    leagueId,
    leagueName: league?.name ?? "League",
    status: league?.status ?? null,
    settings: league ? parseSettings(league) : null,
    members: buildMembers(users),
    teams,
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

/* ------------------------------- the draft -------------------------------- */

// Aug 31, 2026, 10:00 AM EDT (14:00 UTC) - the scheduled draft time. Used as a
// fallback when a league hasn't set its start_time on Sleeper yet.
export const DRAFT_FALLBACK_START = 1788184800000;

type SleeperDraft = {
  draft_id: string;
  status: string;
  type: string;
  start_time: number | null;
  created?: number | null;
  last_picked?: number | null;
  settings?: { rounds?: number; teams?: number; pick_timer?: number };
  draft_order?: Record<string, number> | null;
};
type SleeperPick = {
  pick_no: number;
  round: number;
  draft_slot?: number;
  picked_by: string;
  metadata?: { first_name?: string; last_name?: string; position?: string; team?: string };
};

const getDrafts = (leagueId: string) =>
  get<SleeperDraft[]>(`/league/${leagueId}/drafts`);
const getDraft = (draftId: string) => get<SleeperDraft>(`/draft/${draftId}`);
const getDraftPicks = (draftId: string) =>
  get<SleeperPick[]>(`/draft/${draftId}/picks`);

export type DraftSlotName = { name: string; pick: number; round: number };
export type DraftPick = {
  pickNo: number;
  round: number;
  slot: number;
  team: string;
  player: string;
  position: string;
};
export type DraftState = {
  draftId: string | null;
  status: string | null; // pre_draft | drafting | paused | complete
  type: string | null;
  startTime: number | null;
  rounds: number;
  teams: number;
  pickTimer: number;
  picksMade: number;
  totalPicks: number;
  onClock: DraftSlotName | null;
  onDeck: DraftSlotName | null;
  pickDeadline: number | null; // epoch ms the current pick clock expires
  firstPick: string | null; // slot-1 team, shown before the draft starts
  lastPick: { name: string; player: string; pick: number } | null;
  order: string[]; // "Team (username)" per draft slot (index 0 = slot 1)
  picks: DraftPick[]; // every pick made so far, in order
};

// Snake draft: map a 1-based overall pick number to its round + draft slot.
function slotForPick(pick: number, teams: number): { round: number; slot: number } {
  const round = Math.ceil(pick / teams);
  const idx = (pick - 1) % teams; // 0-based position in the round
  const slot = round % 2 === 1 ? idx + 1 : teams - idx; // even rounds reverse
  return { round, slot };
}

export async function getDraftState(leagueId: string): Promise<DraftState | null> {
  const drafts = await getDrafts(leagueId);
  // A league can have several drafts (e.g. a re-draft). Always use the newest.
  const head = [...(drafts ?? [])].sort(
    (a, b) => (b.created ?? 0) - (a.created ?? 0),
  )[0];
  if (!head) return null;

  const [draft, picks, users] = await Promise.all([
    getDraft(head.draft_id),
    getDraftPicks(head.draft_id),
    getLeagueUsers(leagueId),
  ]);
  const dr = draft ?? head;
  const teams = dr.settings?.teams ?? 0;
  const rounds = dr.settings?.rounds ?? 0;
  const totalPicks = teams * rounds;

  // "Team Name (username)" when a custom team name is set, else just the handle.
  const nameByUser = new Map(
    (users ?? []).map((u) => {
      const team = u.metadata?.team_name?.trim();
      const handle = u.display_name || "Team";
      return [u.user_id, team ? `${team} (${handle})` : handle];
    }),
  );
  // slot -> team name, via the inverted draft_order (user_id -> slot)
  const nameBySlot = new Map<number, string>();
  for (const [userId, slot] of Object.entries(dr.draft_order ?? {})) {
    nameBySlot.set(slot, nameByUser.get(userId) ?? "Team");
  }
  const slotName = (slot: number) => nameBySlot.get(slot) ?? `Slot ${slot}`;

  const picksMade = (picks ?? []).length;

  const namedPick = (pick: number): DraftSlotName | null => {
    if (teams <= 0 || pick < 1 || pick > totalPicks) return null;
    const { round, slot } = slotForPick(pick, teams);
    return { name: slotName(slot), pick, round };
  };

  // Some Sleeper drafts (slow re-drafts) sit at status "pre_draft" while picks
  // are actually being made - so treat "has picks and not finished" as live.
  const complete =
    dr.status === "complete" || (totalPicks > 0 && picksMade >= totalPicks);
  const paused = dr.status === "paused";
  const inProgress =
    !complete && (dr.status === "drafting" || paused || picksMade > 0);
  const onClock = inProgress ? namedPick(picksMade + 1) : null;
  const onDeck = inProgress ? namedPick(picksMade + 2) : null;

  // Normalize the status the UI sees, since Sleeper's raw status can lag.
  const normalizedStatus = complete
    ? "complete"
    : paused
      ? "paused"
      : inProgress
        ? "drafting"
        : dr.status ?? null;

  // Live pick clock: starts when the last pick was made. Paused drafts show no
  // running clock (the UI labels them paused instead).
  const pickTimer = dr.settings?.pick_timer ?? 0;
  const clockBase = dr.last_picked || dr.start_time || 0;
  const pickDeadline =
    inProgress && !paused && pickTimer && clockBase
      ? clockBase + pickTimer * 1000
      : null;

  // Draft order (round 1) and the full pick log for the board.
  const order: string[] = [];
  for (let s = 1; s <= teams; s++) order.push(slotName(s));

  const board: DraftPick[] = [...(picks ?? [])]
    .sort((a, b) => a.pick_no - b.pick_no)
    .map((p) => {
      const md = p.metadata ?? {};
      // Use Sleeper's own round + draft_slot so the board matches the Sleeper
      // board exactly; only fall back to the snake formula if they're missing.
      const fallback = slotForPick(p.pick_no, teams);
      const round = p.round ?? fallback.round;
      const slot = p.draft_slot ?? fallback.slot;
      return {
        pickNo: p.pick_no,
        round,
        slot,
        team: nameByUser.get(p.picked_by) ?? slotName(slot),
        player: `${md.first_name ?? ""} ${md.last_name ?? ""}`.trim() || "—",
        position: md.position ?? "",
      };
    });

  let lastPick: DraftState["lastPick"] = null;
  if (picksMade > 0) {
    const last = [...(picks ?? [])].sort((a, b) => b.pick_no - a.pick_no)[0];
    const md = last.metadata ?? {};
    lastPick = {
      name: nameByUser.get(last.picked_by) ?? "Team",
      player: `${md.first_name ?? ""} ${md.last_name ?? ""}`.trim() || "a player",
      pick: last.pick_no,
    };
  }

  return {
    draftId: dr.draft_id,
    status: normalizedStatus,
    type: dr.type ?? null,
    startTime: dr.start_time ?? null,
    rounds,
    teams,
    pickTimer,
    picksMade,
    totalPicks,
    onClock,
    onDeck,
    pickDeadline,
    firstPick: nameBySlot.get(1) ?? null,
    lastPick,
    order,
    picks: board,
  };
}

/* ------------------- team detail: rosters + est. scores ------------------- */

// Sleeper's weekly projections endpoint carries a player's name, position, team
// AND projected PPR points in one call - so it doubles as our name lookup and
// our "estimated score" source. Cached per (year,week); projections drift
// slowly through the week, so a 30-min hold is plenty and saves CPU.
export type ProjPlayer = { name: string; position: string; team: string; proj: number };

const PROJ_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"] as const;
const projCache = new Map<string, { at: number; map: Map<string, ProjPlayer> }>();
const PROJ_TTL_MS = 30 * 60 * 1000;

async function getWeeklyProjMap(
  year: string,
  week: number,
): Promise<Map<string, ProjPlayer>> {
  const key = `${year}-${week}`;
  const now = Date.now();
  const hit = projCache.get(key);
  if (hit && now - hit.at < PROJ_TTL_MS) return hit.map;

  const qs = PROJ_POSITIONS.map((p) => `position[]=${p}`).join("&");
  type Raw = {
    player_id?: string;
    team?: string | null;
    player?: { first_name?: string; last_name?: string; position?: string } | null;
    stats?: { pts_ppr?: number } | null;
  };
  let rows: Raw[] = [];
  try {
    const res = await fetch(
      `https://api.sleeper.app/projections/nfl/${year}/${week}?season_type=regular&${qs}`,
      { cache: "no-store" },
    );
    if (res.ok) rows = (await res.json()) as Raw[];
  } catch {
    rows = [];
  }

  const map = new Map<string, ProjPlayer>();
  for (const r of rows) {
    if (!r.player_id) continue;
    const pl = r.player ?? {};
    map.set(r.player_id, {
      name: `${pl.first_name ?? ""} ${pl.last_name ?? ""}`.trim() || r.player_id,
      position: pl.position ?? "",
      team: r.team ?? "",
      proj: r.stats?.pts_ppr ?? 0,
    });
  }
  if (map.size > 0) projCache.set(key, { at: now, map });
  return map.size > 0 ? map : hit?.map ?? map;
}

export type TeamPlayer = {
  id: string;
  name: string;
  position: string;
  team: string;
  proj: number;
  live: number; // actual points scored so far this week (Sleeper live)
};
export type TeamDetail = {
  rosterId: number;
  name: string;
  owner: string; // the manager's Sleeper handle (username)
  points: number; // this week's live team total
  played: boolean;
  projected: number; // sum of starters' preseason projected points this week
  projFinal: number; // live-updating projected FINAL: live for players who've
  // gone, projection for the rest (this is what reorders the board live)
  live: number; // live team total (starters' actual points)
  hasLive: boolean; // any live scoring has happened this week
  starters: TeamPlayer[];
};

// Sleeper matchups carry live scoring: `players_points` (per player) and
// `points` (team total) update through the week's games.
type SleeperMatchupLive = SleeperMatchup & {
  players_points?: Record<string, number> | null;
};

// Per-team roster detail for a league: the starting lineup with each player's
// projected AND live points, plus team totals. Used to expand standings rows.
export async function getLeagueTeams(
  leagueId: string,
  week: number,
  year = "2026",
): Promise<{ week: number; teams: TeamDetail[] } | null> {
  const [users, rosters, projMap, matchups] = await Promise.all([
    getLeagueUsers(leagueId),
    getRosters(leagueId),
    getWeeklyProjMap(year, week),
    get<SleeperMatchupLive[]>(`/league/${leagueId}/matchups/${week}`),
  ]);
  const userById = new Map((users ?? []).map((u) => [u.user_id, u]));
  // roster_id -> { players_points, team points } for this week (live).
  const liveByRoster = new Map(
    (matchups ?? []).map((m) => [
      m.roster_id,
      { pp: m.players_points ?? {}, total: m.points ?? 0 },
    ]),
  );

  const teams: TeamDetail[] = (rosters ?? [])
    .filter((r) => r.owner_id)
    .map((r) => {
      const liveInfo = liveByRoster.get(r.roster_id);
      const pp = liveInfo?.pp ?? {};
      const liveTotal = liveInfo?.total ?? 0;
      const starters: TeamPlayer[] = (r.starters ?? [])
        .filter((id) => id && id !== "0")
        .map((id) => {
          const p = projMap.get(id);
          return {
            id,
            name: p?.name ?? `Player ${id}`,
            position: p?.position ?? "",
            team: p?.team ?? "",
            proj: p?.proj ?? 0,
            live: pp[id] ?? 0,
          };
        });
      const projected = starters.reduce((sum, p) => sum + p.proj, 0);
      // Projected final: use live for players who've scored, projection for the
      // rest - this updates and reorders the board as games are played.
      const projFinal = starters.reduce((sum, p) => sum + (p.live > 0 ? p.live : p.proj), 0);
      const owner = r.owner_id ? userById.get(r.owner_id)?.display_name ?? "" : "";
      return {
        rosterId: r.roster_id,
        name: teamName(r, userById),
        owner,
        points: liveTotal,
        played: liveTotal > 0,
        projected,
        projFinal,
        live: liveTotal,
        hasLive: liveTotal > 0,
        starters,
      };
    });

  return { week, teams };
}

/* --------------------- waiver wire / FAAB activity ------------------------ */

type SleeperTxn = {
  type: string; // waiver | free_agent | trade
  status: string; // complete | failed
  created: number;
  roster_ids?: number[];
  adds?: Record<string, number> | null;
  drops?: Record<string, number> | null;
  settings?: { waiver_bid?: number } | null;
};

export type TxnPlayer = { name: string; position: string };
export type WaiverMove = {
  id: string;
  type: "waiver" | "free_agent" | "trade";
  status: string;
  week: number;
  created: number;
  team: string;
  bid: number | null; // FAAB amount for waiver claims
  adds: TxnPlayer[];
  drops: TxnPlayer[];
};
export type FaabRow = {
  rosterId: number;
  name: string;
  used: number;
  remaining: number;
};
export type Bid = { team: string; amount: number; won: boolean };
export type BidGroup = {
  id: string;
  player: TxnPlayer;
  week: number;
  created: number;
  bids: Bid[]; // highest first; winner is the `won` one
};
export type WaiverFeed = {
  faabBudget: number | null;
  faab: FaabRow[];
  moves: WaiverMove[];
  bids: BidGroup[]; // FAAB competitions grouped by the player bid on
};

// Recent waiver / free-agent / FAAB activity for a league, newest first, plus
// each team's FAAB budget status. Pulls the last few weeks of transactions.
export async function getLeagueTransactions(
  leagueId: string,
  throughWeek: number,
  year = "2026",
): Promise<WaiverFeed | null> {
  const startWeek = Math.max(1, throughWeek - 3); // last ~4 weeks of activity
  const weeks = [];
  for (let w = startWeek; w <= Math.max(startWeek, throughWeek); w++) weeks.push(w);

  const [league, users, rosters, projMap, ...txnWeeks] = await Promise.all([
    getLeague(leagueId),
    getLeagueUsers(leagueId),
    getRosters(leagueId),
    getWeeklyProjMap(year, throughWeek),
    ...weeks.map((w) => get<SleeperTxn[]>(`/league/${leagueId}/transactions/${w}`)),
  ]);
  const userById = new Map((users ?? []).map((u) => [u.user_id, u]));
  const nameByRoster = new Map(
    (rosters ?? []).map((r) => [r.roster_id, teamName(r, userById)]),
  );
  const player = (id: string): TxnPlayer => {
    const p = projMap.get(id);
    return { name: p?.name ?? `Player ${id}`, position: p?.position ?? "" };
  };
  const faabBudget = league ? parseSettings(league).faabBudget : null;

  const faab: FaabRow[] = (rosters ?? [])
    .filter((r) => r.owner_id)
    .map((r) => {
      const used = (r.settings as { waiver_budget_used?: number } | null)?.waiver_budget_used ?? 0;
      return {
        rosterId: r.roster_id,
        name: teamName(r, userById),
        used,
        remaining: faabBudget != null ? faabBudget - used : 0,
      };
    })
    .sort((a, b) => b.remaining - a.remaining);

  const moves: WaiverMove[] = [];
  // Group FAAB bids by the player being claimed (winner + everyone they outbid).
  const bidGroups = new Map<
    string,
    { player: TxnPlayer; week: number; created: number; bids: Bid[] }
  >();

  weeks.forEach((w, i) => {
    for (const t of txnWeeks[i] ?? []) {
      const rid = t.roster_ids?.[0];
      const addIds = Object.keys(t.adds ?? {});
      const adds = addIds.map(player);
      const drops = Object.keys(t.drops ?? {}).map(player);
      if (adds.length === 0 && drops.length === 0) continue;
      const team = rid != null ? nameByRoster.get(rid) ?? "Team" : "Team";
      const bid = t.settings?.waiver_bid ?? null;

      // Collect competing FAAB bids on the same player (waiver type, has a bid).
      if (t.type === "waiver" && bid != null && addIds.length > 0) {
        const pid = addIds[0];
        const key = `${w}-${pid}`;
        if (!bidGroups.has(key)) {
          bidGroups.set(key, {
            player: player(pid),
            week: w,
            created: t.created,
            bids: [],
          });
        }
        const g = bidGroups.get(key)!;
        g.bids.push({ team, amount: bid, won: t.status === "complete" });
        g.created = Math.max(g.created, t.created);
        // FAAB waivers live in the grouped "bids by player" section - keep them
        // out of the moves feed so it isn't a wall of duplicate bid rows.
        continue;
      }

      moves.push({
        id: `${t.created}-${rid}`,
        type: (t.type as WaiverMove["type"]) ?? "free_agent",
        status: t.status,
        week: w,
        created: t.created,
        team,
        bid,
        adds,
        drops,
      });
    }
  });
  moves.sort((a, b) => b.created - a.created);

  const bids: BidGroup[] = [...bidGroups.entries()]
    .map(([id, g]) => ({
      id,
      player: g.player,
      week: g.week,
      created: g.created,
      bids: g.bids.sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.created - a.created)
    .slice(0, 30);

  return { faabBudget, faab, moves: moves.slice(0, 40), bids };
}

// ─── The Guillotine Gazette ───────────────────────────────────────────────────
// The weekly waiver roast, computed from the public record.
//
// Week pairing, which is the non-obvious part: Sleeper files a waiver under the
// week its run PROCESSED, but the player it delivers plays the FOLLOWING week.
// So bids from the week W-1 run are judged against week W scoring. Getting this
// backwards makes every expensive pickup look like it scored nothing.
//
// Two rules the league owner has corrected once already, encoded here so the
// copy cannot drift back:
//   - A LOSING BID COSTS NOTHING. Only the winning claim is charged, so `spend`
//     sums winners only and losing amounts are labelled unpaid everywhere.
//   - THE HIGHEST VALID BID ALWAYS WINS. A failed claim showing a larger number
//     than the winner was never a valid claim (typically no drop designated
//     against a full roster) - it is NOT an upset, and those rows are discarded
//     rather than presented as one.

export type GazetteBid = {
  rosterId: number;
  team: string;
  playerId: string;
  player: TxnPlayer;
  bid: number;
  won: boolean;
  points: number | null;
  started: boolean | null;
};

export type GazetteContest = {
  player: TxnPlayer;
  winner: GazetteBid;
  runnerUp: GazetteBid | null;
  gap: number;
  points: number | null;
};

// A player who outscored a slot he could have filled, left on the bench.
export type BenchGem = {
  rosterId: number;
  team: string;
  player: TxnPlayer;
  points: number;
};

export type Gazette = {
  week: number;
  generatedAt: string;
  totals: { spend: number; freshSpend: number; bidsPlaced: number; bidsWon: number; bidsLost: number };
  awards: {
    bigSpender: GazetteBid | null;
    flop: GazetteBid | null;
    steal: GazetteBid | null;
    benched: GazetteBid | null;
    overkill: GazetteContest | null;
    heartbreak: GazetteContest | null;
    lowball: GazetteBid | null;
    // The funniest thing in either run: the biggest MULTIPLE over the next bid.
    // Ratio, not gap - $299 against a $5 bid is 60x and absurd, while
    // $503 against $400 is 1.26x and merely expensive.
    mostAbsurd: GazetteContest | null;
    // The highest-scoring player someone left on their bench this week.
    benchGem: BenchGem | null;
  };
  contests: GazetteContest[];
  freshContests: GazetteContest[];
  scores: { rosterId: number; team: string; points: number }[];
  chopped: { rosterId: number; team: string; points: number | null; avatar: string | null } | null;
  // Real NFL news tied to a team in this league: their rostered player is in a
  // headline. Lets the copy connect the wire to the week's fate ("your QB blew a
  // knee AND you got chopped"). null when nothing matched.
  newsHook: {
    team: string;
    player: string;
    position: string;
    nflTeam: string;
    category: NewsCategory;
    headline: string;
    source: string;
    // The team's role this week, so the copy can land the connection.
    role: "chopped" | "bottom" | "bigSpender" | "flop" | "benched" | "benchGem" | "marquee" | "top" | "other";
  } | null;
  // Season-long FAAB spend, for the "Wallet Watch" receipts: who torches their
  // budget vs who survives on pocket change. null if no FAAB data.
  spending: {
    budget: number | null;
    topSpender: { team: string; used: number } | null;
    cheapest: { team: string; used: number } | null;
  } | null;
};

type RawTxn = {
  type?: string;
  status?: string;
  roster_ids?: number[];
  adds?: Record<string, number> | null;
  drops?: Record<string, number> | null;
  settings?: { waiver_bid?: number; seq?: number } | null;
};

export async function getGazette(
  leagueId: string,
  week: number,
  year = "2026",
): Promise<Gazette | null> {
  const [users, rosters, priorRun, thisRun, matchups, projMap, headlines] = await Promise.all([
    getLeagueUsers(leagueId),
    getRosters(leagueId),
    week > 1
      ? get<RawTxn[]>(`/league/${leagueId}/transactions/${week - 1}`)
      : Promise.resolve([] as RawTxn[]),
    get<RawTxn[]>(`/league/${leagueId}/transactions/${week}`),
    getMatchups(leagueId, week),
    getWeeklyProjMap(year, week),
    getHeadlines().catch(() => []),
  ]);

  const userById = new Map((users ?? []).map((u) => [u.user_id, u]));
  const teamOf = (rid: number) => {
    const r = (rosters ?? []).find((x) => x.roster_id === rid);
    return r ? teamName(r, userById) : `Roster ${rid}`;
  };
  const avatarOf = (rid: number): string | null => {
    const r = (rosters ?? []).find((x) => x.roster_id === rid);
    return avatarUrl(r?.owner_id ? userById.get(r.owner_id) : undefined);
  };
  const playerOf = (id: string): TxnPlayer => {
    const p = projMap.get(id);
    return { name: p?.name ?? `Player ${id}`, position: p?.position ?? "" };
  };

  const scoreByRoster = new Map<number, number>();
  const ptsByRosterPlayer = new Map<number, Record<string, number>>();
  const startersByRoster = new Map<number, Set<string>>();
  for (const m of matchups ?? []) {
    scoreByRoster.set(m.roster_id, m.points ?? 0);
    ptsByRosterPlayer.set(m.roster_id, (m.players_points ?? {}) as Record<string, number>);
    startersByRoster.set(m.roster_id, new Set((m.starters ?? []) as string[]));
  }

  const bidsFrom = (run: RawTxn[] | null, judged: boolean): GazetteBid[] => {
    const out: GazetteBid[] = [];
    for (const t of (run ?? []).filter((x) => x.type === "waiver")) {
      const bid = t.settings?.waiver_bid;
      if (bid == null) continue;
      const rosterId = t.roster_ids?.[0];
      if (rosterId == null) continue;
      for (const playerId of Object.keys(t.adds ?? {})) {
        const won = t.status === "complete";
        const raw = judged && won ? ptsByRosterPlayer.get(rosterId)?.[playerId] : undefined;
        out.push({
          rosterId,
          team: teamOf(rosterId),
          playerId,
          player: playerOf(playerId),
          bid,
          won,
          points: raw === undefined ? null : raw,
          started: judged && won ? startersByRoster.get(rosterId)?.has(playerId) ?? false : null,
        });
      }
    }
    return out;
  };

  // Scored "value" awards (flop/steal/benched) judge THIS PAST WEEKEND's games.
  // Pool every recent pickup from both waiver runs, judged with this week's
  // points, so the freshest performers surface regardless of when they were
  // claimed. `started === true` guarantees the player was actually in this
  // weekend's lineup (so a brand-new claim that has not played can't sneak in).
  const bids = [...bidsFrom(priorRun, true), ...bidsFrom(thisRun, true)];
  const fresh = bidsFrom(thisRun, false); // this morning's run, for the marquee + "just in"
  const freshLost = fresh.filter((b) => !b.won);
  const won = bids.filter((b) => b.won);

  const byBid = [...won].sort((a, b) => b.bid - a.bid);
  const bigSpender = byBid[0] ?? null;

  // A flop is a guy you PAID for and STARTED this weekend who then bricked. A
  // benched pickup (e.g. stashing an injured stud like A.J. Brown) is not a flop.
  const flop =
    [...won].filter((b) => b.bid >= 20 && b.points != null && b.started === true)
      .sort((a, b) => a.points! / a.bid - b.points! / b.bid)[0] ?? null;
  // Benched: paid up, sat him, and he still put up real points this weekend (the
  // points you left on the bench). Require a real haul so a just-claimed guy who
  // never played for you can't register.
  const benched =
    [...won].filter((b) => b.bid >= 25 && b.started === false && b.points != null && b.points >= 8)
      .sort((a, b) => b.bid - a.bid)[0] ?? null;
  // Best buy: cheapest starter who actually delivered this weekend.
  const steal =
    [...won].filter((b) => b.points != null && b.points > 0 && b.started === true)
      .sort((a, b) => b.points! / Math.max(1, b.bid) - a.points! / Math.max(1, a.bid))[0] ?? null;

  const contestsOf = (list: GazetteBid[]): GazetteContest[] => {
    const byPlayer = new Map<string, GazetteBid[]>();
    for (const b of list) byPlayer.set(b.playerId, [...(byPlayer.get(b.playerId) ?? []), b]);
    const out: GazetteContest[] = [];
    for (const [, group] of byPlayer) {
      const winner = group.find((g) => g.won);
      if (!winner) continue;
      // Losing to yourself is not a rivalry: a manager often stacks several
      // bids on one player at different priorities.
      const runnerUp =
        group.filter((g) => !g.won && g.rosterId !== winner.rosterId)
          .sort((a, b) => b.bid - a.bid)[0] ?? null;
      if (!runnerUp) continue;
      const gap = winner.bid - runnerUp.bid;
      // Discard invalid claims that merely carried a bigger number - see header.
      if (gap < 0) continue;
      out.push({ player: winner.player, winner, runnerUp, gap, points: winner.points });
    }
    return out;
  };

  const contests = contestsOf(bids);
  const freshContests = contestsOf(fresh);

  // The marquee is the loudest overpay from THE RUN THAT JUST CLEARED (the fresh
  // bids, thisRun) - a Wednesday-morning paper leads with this morning's waiver
  // news, not a bid the league already saw (and we already printed) a week ago.
  // Because it is always the newest run, the headline is fresh every week and can
  // never repeat a prior edition. Two ways to earn it: a shocking raw number (a
  // $503 claim) or a shocking MULTIPLE ($182 for a $2 player = 91x); score both on
  // one scale where each 1x of overpay is worth ~$6 of buzz.
  const BUZZ_PER_MULTIPLE = 6;
  const ratio = (c: GazetteContest) => c.winner.bid / Math.max(1, c.runnerUp?.bid ?? 1);
  const talkValue = (c: GazetteContest) => {
    const contested = (c.runnerUp?.bid ?? 0) > 0;
    const mult = contested ? ratio(c) : 1;
    return c.winner.bid + BUZZ_PER_MULTIPLE * mult;
  };
  const mostAbsurd =
    [...freshContests]
      .filter((c) => c.winner.bid >= 25 && (ratio(c) >= 3 || c.winner.bid >= 100))
      .sort((a, b) => talkValue(b) - talkValue(a))[0] ?? null;

  const overkill = [...contests].sort((a, b) => b.gap - a.gap)[0] ?? null;
  const heartbreak = [...contests].sort((a, b) => a.gap - b.gap)[0] ?? null;
  // Cheapest offer: the stingiest LOSING bid from this morning's fresh run, on a
  // player someone actually won. Fresh, and about the just-cleared run.
  const lowball =
    [...freshLost].filter((b) => fresh.some((w) => w.won && w.playerId === b.playerId))
      .sort((a, b) => a.bid - b.bid)[0] ?? null;

  // Bench gem: the highest-scoring player left OUT of a starting lineup this
  // week (in players_points but not in that roster's starters). The "you started
  // the wrong guy" award. Only counts a real haul (>= 12) so it's actually funny.
  let benchGem: BenchGem | null = null;
  for (const [rid, pp] of ptsByRosterPlayer) {
    const starters = startersByRoster.get(rid) ?? new Set<string>();
    for (const [pid, p] of Object.entries(pp)) {
      if (starters.has(pid) || !(p >= 12)) continue;
      if (!benchGem || p > benchGem.points) {
        benchGem = { rosterId: rid, team: teamOf(rid), player: playerOf(pid), points: p };
      }
    }
  }

  const scores = [...scoreByRoster.entries()]
    .map(([rosterId, points]) => ({ rosterId, team: teamOf(rosterId), points }))
    .filter((s) => s.points > 0)
    .sort((a, b) => b.points - a.points);

  const choppedTxn = (thisRun ?? []).find((t) => t.type === "chopped");
  const choppedRosterId = choppedTxn ? Number(Object.values(choppedTxn.drops ?? {})[0]) : null;

  // Off the wire: tie a real NFL headline to a team in this league. Walk the most
  // roastable teams first (the one that got chopped is the juiciest), and for each
  // scan their rostered players against the day's headlines. First solid full-name
  // match wins. This is what lets the copy go "your QB blew a knee AND you got
  // chopped - offer him yours."
  const newsHook = (() => {
    if (!headlines.length) return null;
    type Role = NonNullable<Gazette["newsHook"]>["role"];
    const bottom = scores[scores.length - 1] ?? null;
    const top = scores[0] ?? null;

    // Give EVERY roster its most roast-worthy role, so no team is invisible to the
    // wire (the old version only checked 6 teams and missed benched-award guys like
    // an injured Mike Evans). Highest-weight role wins per roster.
    const roleWeight: Record<Role, number> = {
      chopped: 7, bottom: 6, flop: 5, benched: 5, benchGem: 4,
      marquee: 4, bigSpender: 3, top: 2, other: 1,
    };
    const roleOf = new Map<number, Role>();
    const claim = (rid: number | null | undefined, role: Role) => {
      if (rid == null) return;
      const cur = roleOf.get(rid);
      if (!cur || roleWeight[role] > roleWeight[cur]) roleOf.set(rid, role);
    };
    for (const r of rosters ?? []) if (r.owner_id) claim(r.roster_id, "other");
    claim(top?.rosterId, "top");
    claim(bigSpender?.rosterId, "bigSpender");
    claim(mostAbsurd?.winner.rosterId, "marquee");
    claim(benchGem?.rosterId, "benchGem");
    claim(benched?.rosterId, "benched");
    claim(flop?.rosterId, "flop");
    claim(bottom?.rosterId, "bottom");
    claim(choppedRosterId, "chopped");

    // How dramatic (roastable) each news category is. "other" = neutral news,
    // skipped entirely - a vague callout reads as reporting, not trolling.
    const catWeight: Record<NewsCategory, number> = {
      injury: 6, legal: 5, suspension: 5, benched: 4, trade: 3, bigGame: 3, other: 0,
    };

    const lowHeadlines = headlines.map((h) => ({ ...h, lc: h.title.toLowerCase(), cat: classify(h.title) }));
    // Don't feature the marquee team here too - that's the same manager twice on
    // one page. Penalize their roster so the wire prefers a DIFFERENT team's
    // story, and only falls back to the marquee team if nothing else matched.
    const marqueeRid = mostAbsurd?.winner.rosterId ?? null;
    let best: NonNullable<Gazette["newsHook"]> | null = null;
    let bestScore = -Infinity; // so a penalized marquee-team match can still fall back
    for (const [rid, role] of roleOf) {
      const roster = (rosters ?? []).find((r) => r.roster_id === rid);
      for (const id of roster?.players ?? []) {
        const p = projMap.get(id);
        const name = p?.name;
        if (!name || !name.includes(" ") || name.length < 6) continue; // need a real full name
        const needle = name.toLowerCase();
        for (const h of lowHeadlines) {
          if (h.cat === "other" || !h.lc.includes(needle)) continue;
          // Score = how dramatic the news is + how central this team is this week.
          // Injuries to a chopped/bottom team are the jackpot. Same team as the
          // marquee gets buried so we only reuse it as a last resort.
          let score = catWeight[h.cat] * 2 + roleWeight[role];
          if (rid === marqueeRid) score -= 100;
          if (score > bestScore) {
            bestScore = score;
            best = {
              team: teamOf(rid),
              player: name,
              position: p?.position ?? "",
              nflTeam: p?.team ?? "",
              category: h.cat,
              headline: h.title,
              source: h.source,
              role,
            };
          }
        }
      }
    }
    return best;
  })();

  // Wallet Watch: season FAAB spend per team (Sleeper tracks it on the roster).
  // Biggest wallet = most spent overall; tightest = least spent among teams that
  // actually played this week (so a chopped/bye team isn't crowned "thrifty").
  const spending = (() => {
    const usedByRoster = new Map<number, number>();
    for (const r of rosters ?? []) {
      if (!r.owner_id) continue;
      const used = (r.settings as { waiver_budget_used?: number } | null)?.waiver_budget_used ?? 0;
      usedByRoster.set(r.roster_id, used);
    }
    if (usedByRoster.size === 0) return null;
    let topSpender: { team: string; used: number } | null = null;
    for (const [rid, used] of usedByRoster) {
      if (!topSpender || used > topSpender.used) topSpender = { team: teamOf(rid), used };
    }
    let cheapest: { team: string; used: number } | null = null;
    for (const [rid, pts] of scoreByRoster) {
      if (pts <= 0) continue; // only teams that played this week
      const used = usedByRoster.get(rid);
      if (used == null) continue;
      if (!cheapest || used < cheapest.used) cheapest = { team: teamOf(rid), used };
    }
    // Budget isn't fetched in this function; the copy just reads the raw $ used.
    return { budget: null, topSpender, cheapest };
  })();

  return {
    week,
    generatedAt: new Date().toISOString(),
    totals: {
      // Winners only. A losing bid is never charged.
      spend: won.reduce((s, b) => s + b.bid, 0),
      freshSpend: fresh.filter((b) => b.won).reduce((s, b) => s + b.bid, 0),
      bidsPlaced: bids.length,
      bidsWon: won.length,
      bidsLost: bids.filter((b) => !b.won).length,
    },
    awards: { bigSpender, flop, steal, benched, overkill, heartbreak, lowball, mostAbsurd, benchGem },
    contests: contests.sort((a, b) => b.winner.bid - a.winner.bid).slice(0, 8),
    freshContests: freshContests.sort((a, b) => b.winner.bid - a.winner.bid).slice(0, 8),
    scores,
    chopped: choppedRosterId
      ? {
          rosterId: choppedRosterId,
          team: teamOf(choppedRosterId),
          points: scoreByRoster.get(choppedRosterId) ?? null,
          avatar: avatarOf(choppedRosterId),
        }
      : null,
    newsHook,
    spending,
  };
}
