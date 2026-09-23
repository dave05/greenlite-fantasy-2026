#!/usr/bin/env node
// Gather one week of Guillotine evidence and work out who deserves roasting.
//
// Everything here comes from Sleeper's public read-only API. Output is a single
// JSON blob on stdout, consumed by render.mjs - so the analysis can be eyeballed
// and re-run without touching the newspaper layout.
//
//   node collect.mjs [--week N] > week.json
//
// Week defaults to the last COMPLETED week (state.week - 1): Sleeper advances
// the NFL week after Monday night, so the current week is still being played.
//
// The pairing matters and is not obvious. Sleeper files a waiver under the week
// its run PROCESSED, but the player it delivers plays the FOLLOWING week. So a
// bid in /transactions/1 is judged against week 2 scoring. Verified against the
// live league: a $503 bid in the week-1 run scored 20.9 in week 2.
//
// The paper therefore reports two things for week W:
//   - THE VERDICT  bids from the week W-1 run, now judged on week W points
//   - FRESH MONEY  bids from the week W run, still awaiting a verdict

const API = "https://api.sleeper.app/v1";
const LEAGUE = process.env.SLEEPER_LEAGUE_CHOPPED || "1394820785951997952";

const get = async (path) => {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
};

// The full player file is ~15MB, so cache it on disk. Names change rarely; a
// week-old copy is fine and keeps a scheduled run from re-downloading it.
async function loadPlayers() {
  const { readFile, writeFile, mkdir } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = `${tmpdir()}/sleeper-players.json`;
  try {
    const stat = await (await import("node:fs/promises")).stat(path);
    if (Date.now() - stat.mtimeMs < 7 * 24 * 3600 * 1000) {
      return JSON.parse(await readFile(path, "utf8"));
    }
  } catch {
    /* no cache yet */
  }
  const all = await get("/players/nfl");
  // Keep only what the paper prints; the rest is 14MB of noise.
  const slim = {};
  for (const [id, p] of Object.entries(all)) {
    slim[id] = {
      name: p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || id,
      pos: p.position ?? "",
      team: p.team ?? "FA",
    };
  }
  await mkdir(tmpdir(), { recursive: true }).catch(() => {});
  await writeFile(path, JSON.stringify(slim));
  return slim;
}

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};

const money = (n) => `$${n}`;

async function main() {
  const state = await get("/state/nfl");
  const week = Number(arg("--week") ?? Math.max(1, (state.week ?? 1) - 1));

  const [users, rosters, priorRun, thisRun, matchups, players] = await Promise.all([
    get(`/league/${LEAGUE}/users`),
    get(`/league/${LEAGUE}/rosters`),
    // The run that DELIVERED this week's players - the one we can now judge.
    week > 1 ? get(`/league/${LEAGUE}/transactions/${week - 1}`) : Promise.resolve([]),
    // The run just completed - money spent, verdict pending.
    get(`/league/${LEAGUE}/transactions/${week}`),
    get(`/league/${LEAGUE}/matchups/${week}`),
    loadPlayers(),
  ]);
  const txns = thisRun;

  const userById = new Map(users.map((u) => [u.user_id, u]));
  const teamOf = (rosterId) => {
    const r = rosters.find((x) => x.roster_id === rosterId);
    const u = r?.owner_id ? userById.get(r.owner_id) : null;
    return u?.metadata?.team_name?.trim() || u?.display_name || `Roster ${rosterId}`;
  };
  const playerName = (id) => players[id]?.name ?? `Player ${id}`;
  const playerMeta = (id) => players[id] ?? { name: `Player ${id}`, pos: "", team: "" };

  // roster_id -> that week's score, and per-player points
  const scoreByRoster = new Map();
  const pointsByRosterPlayer = new Map();
  const startersByRoster = new Map();
  for (const m of matchups ?? []) {
    scoreByRoster.set(m.roster_id, m.points ?? 0);
    pointsByRosterPlayer.set(m.roster_id, m.players_points ?? {});
    startersByRoster.set(m.roster_id, new Set(m.starters ?? []));
  }
  const pointsFor = (rosterId, playerId) => {
    const v = (pointsByRosterPlayer.get(rosterId) ?? {})[playerId];
    return v === undefined ? null : v;
  };
  // Paying a fortune and then leaving him on the bench is its own crime.
  const startedBy = (rosterId, playerId) =>
    startersByRoster.get(rosterId)?.has(playerId) ?? false;

  // ── Waivers ────────────────────────────────────────────────────────────────
  // `judged` = attach this week's scoring, which only makes sense for the
  // prior run. Bids from this week's run have not played yet.
  const bidsFrom = (run, judged) => {
    const out = [];
    for (const t of (run ?? []).filter((x) => x.type === "waiver")) {
      const bid = t.settings?.waiver_bid;
      if (bid == null) continue;
      const rosterId = t.roster_ids?.[0];
      for (const playerId of Object.keys(t.adds ?? {})) {
        const wonIt = t.status === "complete";
        out.push({
          rosterId,
          team: teamOf(rosterId),
          playerId,
          player: playerName(playerId),
          meta: playerMeta(playerId),
          bid,
          won: wonIt,
          points: judged && wonIt ? pointsFor(rosterId, playerId) : null,
          started: judged && wonIt ? startedBy(rosterId, playerId) : null,
          dropped: Object.keys(t.drops ?? {}).map(playerName),
        });
      }
    }
    return out;
  };

  const bids = bidsFrom(priorRun, true);
  const freshBids = bidsFrom(thisRun, false);
  const won = bids.filter((b) => b.won);
  const lost = bids.filter((b) => !b.won);

  // ── The awards ─────────────────────────────────────────────────────────────
  const byBidDesc = [...won].sort((a, b) => b.bid - a.bid);

  const bigSpender = byBidDesc[0] ?? null;

  // Worst value: paid real money, got nothing. Only judge bids with a pulse,
  // otherwise a $1 pickup that blanked wins "worst" every week.
  const flop = [...won]
    .filter((b) => b.bid >= 20 && b.points != null)
    .sort((a, b) => a.points / a.bid - b.points / b.bid)[0] ?? null;

  // Paid real money, then started someone else. The purest form of self-harm.
  const benched = [...won]
    .filter((b) => b.bid >= 25 && b.started === false)
    .sort((a, b) => b.bid - a.bid)[0] ?? null;

  // Best value: the opposite, and the one person who gets praised.
  const steal = [...won]
    .filter((b) => b.points != null && b.points > 0)
    .sort((a, b) => b.points / Math.max(1, b.bid) - a.points / Math.max(1, a.bid))[0] ?? null;

  // Contested players: someone won, others lost. The gap is the joke.
  const contests = [];
  const byPlayer = new Map();
  for (const b of bids) {
    const arr = byPlayer.get(b.playerId) ?? [];
    arr.push(b);
    byPlayer.set(b.playerId, arr);
  }
  for (const [playerId, group] of byPlayer) {
    const winner = group.find((g) => g.won);
    // A manager often submits several bids on one player at different
    // priorities; losing to yourself is not a rivalry.
    const losers = group
      .filter((g) => !g.won && g.rosterId !== winner?.rosterId)
      .sort((a, b) => b.bid - a.bid);
    if (winner && losers.length) {
      contests.push({
        player: playerName(playerId),
        meta: playerMeta(playerId),
        winner,
        losers,
        gap: winner.bid - losers[0].bid,
        points: winner.points,
      });
    }
  }
  // Highest valid bid always wins - that is the whole mechanic. A FAILED claim
  // carrying a larger number than the winner was never a valid claim: it had no
  // drop designated against a full roster, or was otherwise rejected before the
  // amount mattered. Verified in the live league - a $203 claim failed with
  // drops=(none) while the $125 winner dropped a player, and the bidder still
  // had $497 of budget, so money was not the reason.
  //
  // Those rows are therefore NOT evidence that a lower bid won, and must never
  // be framed that way. They are dropped from the contest set entirely rather
  // than dressed up as an award.
  const legit = contests.filter((c) => c.gap >= 0);
  // Closest miss, and the most lopsided overpay.
  const heartbreak = [...legit].sort((a, b) => a.gap - b.gap)[0] ?? null;
  const overkill = [...legit].sort((a, b) => b.gap - a.gap)[0] ?? null;

  // Lowball: the cheapest failed bid on a player somebody else actually paid for.
  const lowball =
    [...lost]
      .filter((b) => won.some((w) => w.playerId === b.playerId))
      .sort((a, b) => a.bid - b.bid)[0] ?? null;

  // ── Scores and the chop ────────────────────────────────────────────────────
  const scores = [...scoreByRoster.entries()]
    .map(([rosterId, points]) => ({ rosterId, team: teamOf(rosterId), points }))
    .filter((s) => s.points > 0)
    .sort((a, b) => b.points - a.points);

  const choppedTxn = (txns ?? []).find((t) => t.type === "chopped");
  const choppedRosterId = choppedTxn
    ? Number(Object.values(choppedTxn.drops ?? {})[0])
    : null;
  const chopped = choppedRosterId
    ? {
        rosterId: choppedRosterId,
        team: teamOf(choppedRosterId),
        points: scoreByRoster.get(choppedRosterId) ?? null,
      }
    : null;

  // Total FAAB actually SPENT: winning claims only. A losing bid costs the
  // bidder nothing, so failed claims must never be added into a spend figure.
  const spend = won.reduce((sum, b) => sum + b.bid, 0);
  const freshSpend = freshBids.filter((b) => b.won).reduce((sum, b) => sum + b.bid, 0);

  console.log(
    JSON.stringify(
      {
        league: LEAGUE,
        week,
        generatedAt: new Date().toISOString(),
        totals: {
          spend,
          freshSpend,
          bidsPlaced: bids.length,
          bidsWon: won.length,
          bidsLost: lost.length,
          contested: contests.length,
        },
        awards: { bigSpender, flop, steal, benched, heartbreak, overkill, lowball },
        contests: contests.sort((a, b) => b.winner.bid - a.winner.bid).slice(0, 8),
        topBids: byBidDesc.slice(0, 10),
        freshMoney: freshBids.filter((b) => b.won).sort((a, b) => b.bid - a.bid).slice(0, 8),
        scores,
        chopped,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(`collect failed: ${err.message}`);
  process.exit(1);
});
