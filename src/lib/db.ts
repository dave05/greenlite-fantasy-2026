import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { CAP_PER_LEAGUE, LeagueId, MANAGERS } from "./roster";

// Vercel's Neon integration provisions DATABASE_URL (and POSTGRES_URL aliases).
const DB_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  "";

export type Assignment = {
  name: string;
  league: LeagueId | null;
  claimedAt: string | null;
};

export type State = {
  players: Assignment[];
  counts: Record<LeagueId, number>;
  remaining: number;
  full: boolean;
};

export type ClaimResult =
  | { ok: true; name: string; league: LeagueId }
  | { ok: false; reason: "unknown_name" | "already_claimed" | "full" };

const isManager = (name: string) => MANAGERS.includes(name);

function randomLeague(): LeagueId {
  // Vary by clock; the DB cap guard is what actually keeps leagues balanced.
  return Date.now() % 2 === 0 ? "navy" : "marine";
}

/* -------------------------------------------------------------------------- */
/*  Neon-backed store (production)                                             */
/* -------------------------------------------------------------------------- */

let _sql: NeonQueryFunction<false, false> | null = null;
let _ready: Promise<void> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  // Lazy init — never call neon() at module top level, it throws without a URL
  // and would crash `next build` before the DB is provisioned.
  if (!_sql) _sql = neon(DB_URL);
  return _sql;
}

async function ensureReady(): Promise<void> {
  if (_ready) return _ready;
  _ready = (async () => {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS assignments (
        name       text PRIMARY KEY,
        league     text,
        claimed_at timestamptz
      )
    `;
    // Seed the 28 managers once; ON CONFLICT keeps existing claims intact.
    for (const name of MANAGERS) {
      await sql`
        INSERT INTO assignments (name, league, claimed_at)
        VALUES (${name}, NULL, NULL)
        ON CONFLICT (name) DO NOTHING
      `;
    }
  })();
  return _ready;
}

async function neonGetState(): Promise<State> {
  await ensureReady();
  const sql = getSql();
  const rows = (await sql`
    SELECT name, league, claimed_at FROM assignments ORDER BY name
  `) as { name: string; league: LeagueId | null; claimed_at: string | null }[];
  return buildState(
    rows.map((r) => ({ name: r.name, league: r.league, claimedAt: r.claimed_at })),
  );
}

async function neonClaim(name: string): Promise<ClaimResult> {
  if (!isManager(name)) return { ok: false, reason: "unknown_name" };
  await ensureReady();
  const sql = getSql();

  // Try the randomly-picked league first, then the other. The subquery cap
  // makes each UPDATE atomic, so two people spinning at once can't overfill.
  const first = randomLeague();
  const second: LeagueId = first === "navy" ? "marine" : "navy";

  for (const league of [first, second] as LeagueId[]) {
    const updated = (await sql`
      UPDATE assignments
      SET league = ${league}, claimed_at = now()
      WHERE name = ${name}
        AND league IS NULL
        AND (SELECT count(*) FROM assignments WHERE league = ${league}) < ${CAP_PER_LEAGUE}
      RETURNING league
    `) as { league: LeagueId }[];
    if (updated.length > 0) return { ok: true, name, league };
  }

  // Nothing updated — figure out why for a useful message.
  const existing = (await sql`
    SELECT league FROM assignments WHERE name = ${name}
  `) as { league: LeagueId | null }[];
  if (existing[0]?.league) return { ok: false, reason: "already_claimed" };
  return { ok: false, reason: "full" };
}

/* -------------------------------------------------------------------------- */
/*  In-memory store (local dev / no DATABASE_URL)                             */
/* -------------------------------------------------------------------------- */

const mem = new Map<string, Assignment>(
  MANAGERS.map((name) => [name, { name, league: null, claimedAt: null }]),
);

function memGetState(): State {
  return buildState([...mem.values()]);
}

function memClaim(name: string): ClaimResult {
  if (!isManager(name)) return { ok: false, reason: "unknown_name" };
  const current = mem.get(name)!;
  if (current.league) return { ok: false, reason: "already_claimed" };

  const counts = countLeagues([...mem.values()]);
  const open = (["navy", "marine"] as LeagueId[]).filter(
    (l) => counts[l] < CAP_PER_LEAGUE,
  );
  if (open.length === 0) return { ok: false, reason: "full" };

  const pick = randomLeague();
  const league = open.includes(pick) ? pick : open[0];
  mem.set(name, { name, league, claimedAt: new Date().toISOString() });
  return { ok: true, name, league };
}

/* -------------------------------------------------------------------------- */
/*  Helpers + public API                                                      */
/* -------------------------------------------------------------------------- */

function countLeagues(players: Assignment[]): Record<LeagueId, number> {
  return players.reduce(
    (acc, p) => {
      if (p.league) acc[p.league] += 1;
      return acc;
    },
    { navy: 0, marine: 0 } as Record<LeagueId, number>,
  );
}

function buildState(players: Assignment[]): State {
  const counts = countLeagues(players);
  const remaining = players.filter((p) => !p.league).length;
  return {
    players,
    counts,
    remaining,
    full: counts.navy >= CAP_PER_LEAGUE && counts.marine >= CAP_PER_LEAGUE,
  };
}

export const usingDatabase = Boolean(DB_URL);

if (!usingDatabase && process.env.NODE_ENV === "production") {
  // Loud warning: prod without a DB means assignments won't persist across
  // serverless invocations. Provision Neon and set DATABASE_URL.
  console.warn(
    "[greenlite] No DATABASE_URL set — using in-memory store. Assignments will NOT persist.",
  );
}

export async function getState(): Promise<State> {
  return usingDatabase ? neonGetState() : memGetState();
}

export async function claim(name: string): Promise<ClaimResult> {
  return usingDatabase ? neonClaim(name) : memClaim(name);
}
