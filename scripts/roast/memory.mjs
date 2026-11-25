#!/usr/bin/env node
// The Gazette's memory: who everyone is, what they have done, and every joke
// already printed about them - so each week can call back to old crimes
// without ever repeating a gag.
//
//   node memory.mjs brief  gazette.json              # read this before writing
//   node memory.mjs check  gazette.json copy.json    # exit 1 on a repeated joke
//   node memory.mjs record gazette.json [copy.json]  # after sending; then commit
//
// Everything lives in league-memory/ (override with MEMORY_DIR):
//   members.json     one profile per manager, keyed by Sleeper user_id. The
//                    personal fields are written by hand; `teams` and `status`
//                    are kept up to date by `record`.
//   rap-sheet.jsonl  every award and chop, one row per offence. Written only by
//                    `record`, straight from collect.mjs output - facts, not
//                    jokes.
//   jokes.jsonl      every joke published, paper and email. `check` compares
//                    new copy against it.
//   storylines.json  what the group chat is talking about, written by hand;
//                    `brief` shows the ones live for the week being written.
//
// `record` is idempotent per week: it replaces that week's rows, so re-running
// a week never double-counts.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCopy, printedJokes } from "./copy.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DIR = process.env.MEMORY_DIR || join(here, "..", "..", "league-memory");
const MEMBERS = join(DIR, "members.json");
const RAP = join(DIR, "rap-sheet.jsonl");
const JOKES = join(DIR, "jokes.jsonl");
const STORYLINES = join(DIR, "storylines.json");

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback);
const readJsonl = (p) =>
  existsSync(p)
    ? readFileSync(p, "utf8")
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l))
    : [];
const writeJsonl = (p, rows) =>
  writeFileSync(p, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));

const money = (n) => `$${Number(n ?? 0).toLocaleString("en-US")}`;
const pts = (n) => (n == null ? "—" : Number(n).toFixed(1));

const blankProfile = (displayName) => ({
  display_name: displayName ?? "",
  real_name: "",
  nicknames: [],
  teams: [],
  nfl_team: "",
  tendencies: [],
  running_gags: [],
  off_limits: [],
  notes: "",
  status: "alive",
});

// ── Repeat detection ────────────────────────────────────────────────────────
// Numbers, names and filler change week to week; the joke is in what is left.
// Two lines sharing half their remaining words are the same joke.
const STOP = new Set(
  "the a an and or but of to in on for at by with from that this is are was were be been it its he him his she her they them their you your we our i me my not no so as if then than too very just only also all any some one who what which when where why how do does did done have has had will would can could should into out up down over off again more most such own same there here".split(" "),
);
const words = (s) =>
  new Set(
    String(s ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)),
  );
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const SIMILAR = 0.5;
function similarity(a, b) {
  if (norm(a) === norm(b)) return 1;
  const A = words(a);
  const B = words(b);
  if (A.size < 3 || B.size < 3) return 0;
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  return both / (A.size + B.size - both);
}

// ── Rap sheet: the facts behind every award ─────────────────────────────────
function offences(d) {
  const a = d.awards ?? {};
  const rows = [];
  const add = (kind, ownerId, team, extra) => ownerId && rows.push({ week: d.week, kind, ownerId, team, ...extra });
  const bid = (b) => ({ player: b.player, pos: b.meta?.pos ?? "", bid: b.bid, points: b.points });
  if (a.bigSpender) add("big_spender", a.bigSpender.ownerId, a.bigSpender.team, bid(a.bigSpender));
  if (a.flop) add("flop", a.flop.ownerId, a.flop.team, bid(a.flop));
  if (a.benched) add("benched", a.benched.ownerId, a.benched.team, bid(a.benched));
  if (a.steal) add("steal", a.steal.ownerId, a.steal.team, bid(a.steal));
  if (a.lowball) add("lowball", a.lowball.ownerId, a.lowball.team, bid(a.lowball));
  if (a.overkill)
    add("overkill", a.overkill.winner.ownerId, a.overkill.winner.team, {
      ...bid(a.overkill.winner),
      nextBid: a.overkill.losers[0]?.bid ?? null,
      gap: a.overkill.gap,
    });
  if (a.heartbreak && a.heartbreak.losers[0])
    add("heartbreak", a.heartbreak.losers[0].ownerId, a.heartbreak.losers[0].team, {
      player: a.heartbreak.player,
      bid: a.heartbreak.losers[0].bid,
      winningBid: a.heartbreak.winner.bid,
      winner: a.heartbreak.winner.team,
    });
  for (const h of a.hoarder?.hoarders ?? [])
    add("hoarder", h.ownerId, h.team, { remaining: h.remaining, budget: a.hoarder.budget });
  const top = d.scores?.[0];
  if (top) add("top_score", top.ownerId, top.team, { points: top.points });
  if (d.chopped) add("chopped", d.chopped.ownerId, d.chopped.team, { points: d.chopped.points });
  return rows;
}

const describe = (r) => {
  switch (r.kind) {
    case "big_spender":
      return `biggest winning bid: ${money(r.bid)} on ${r.player} (${pts(r.points)} pts)`;
    case "flop":
      return `FLOP: ${money(r.bid)} on ${r.player}, ${pts(r.points)} pts`;
    case "benched":
      return `BENCHED: paid ${money(r.bid)} for ${r.player}, left him on the bench (${pts(r.points)} pts)`;
    case "steal":
      return `STEAL: ${money(r.bid)} for ${r.player}, ${pts(r.points)} pts`;
    case "lowball":
      return `LOWBALL: offered ${money(r.bid)} for ${r.player} (unpaid; someone else won him)`;
    case "overkill":
      return `OVERKILL: ${money(r.bid)} on ${r.player} when the next bid was ${money(r.nextBid)} (${money(r.gap)} clear)`;
    case "heartbreak":
      return `HEARTBREAK: bid ${money(r.bid)} for ${r.player}, lost to ${r.winner}'s ${money(r.winningBid)} (unpaid)`;
    case "hoarder":
      return `HOARDER: still sitting on all ${money(r.remaining)} of FAAB`;
    case "top_score":
      return `top score of the week: ${pts(r.points)}`;
    case "chopped":
      return `CHOPPED with ${pts(r.points)} pts`;
    default:
      return r.kind;
  }
};

// ── Commands ────────────────────────────────────────────────────────────────
function brief(d) {
  const members = readJson(MEMBERS, {});
  const rap = readJsonl(RAP).filter((r) => r.week < d.week);
  const jokes = readJsonl(JOKES).filter((j) => j.week < d.week);
  const nameOf = (id) => {
    const p = members[id];
    const m = d.managers?.find((x) => x.ownerId === id);
    return p?.real_name || m?.team || p?.display_name || m?.displayName || id;
  };

  const inNews = new Map();
  for (const r of offences(d)) {
    if (!inNews.has(r.ownerId)) inNews.set(r.ownerId, []);
    inNews.get(r.ownerId).push(r);
  }

  const out = [];
  out.push(`# Gazette briefing - Week ${d.week}`, "");
  for (const w of chatProblems(d)) out.push(`!! ${w}`, "!! Follow ROUTINE.md Step 2b: email the owner for the chat and stop.", "");
  out.push(
    "Use this to write copy.json. Call back to old offences by name and week; that is what the memory is for.",
    "Never reuse a joke or a premise listed under 'already used'. Never touch anything under OFF LIMITS.",
    "",
  );

  const profileLines = (id) => {
    const p = members[id];
    if (!p) return ["  (no profile yet - `record` will create one)"];
    const l = [];
    if (p.real_name) l.push(`  goes by: ${p.real_name}`);
    if (p.nicknames?.length) l.push(`  nicknames: ${p.nicknames.join(", ")}`);
    if (p.teams?.length > 1) l.push(`  team names so far: ${p.teams.join(" → ")}`);
    if (p.nfl_team) l.push(`  roots for: ${p.nfl_team}`);
    if (p.tendencies?.length) l.push(`  tendencies: ${p.tendencies.join("; ")}`);
    if (p.running_gags?.length) l.push(`  running gags: ${p.running_gags.join("; ")}`);
    if (p.notes) l.push(`  notes: ${p.notes}`);
    if (p.status && p.status !== "alive") l.push(`  status: ${p.status}`);
    if (p.off_limits?.length) l.push(`  OFF LIMITS: ${p.off_limits.join("; ")}`);
    return l;
  };

  // Storylines are live from `from_week` through `until_week` (inclusive);
  // leave until_week out for one that runs all season.
  const live = readJson(STORYLINES, []).filter(
    (s) => (s.from_week ?? 0) <= d.week && d.week <= (s.until_week ?? Infinity),
  );
  if (live.length) {
    out.push("## From the group chat this week", "");
    for (const s of live) {
      out.push(`- ${s.topic}`);
      if (s.angle) out.push(`  angle: ${s.angle}`);
      if (s.notes) out.push(`  notes: ${s.notes}`);
    }
    out.push("");
  }

  out.push("## In this week's news", "");
  if (!inNews.size) out.push("Nobody. A quiet week.", "");
  for (const [id, now] of inNews) {
    out.push(`### ${nameOf(id)}  (${id})`);
    out.push(`  this week: ${now.map(describe).join(" | ")}`);
    out.push(...profileLines(id));
    const past = rap.filter((r) => r.ownerId === id);
    if (past.length) {
      out.push("  rap sheet:");
      for (const r of past) out.push(`    - wk ${r.week}: ${describe(r)}`);
      const counts = {};
      for (const r of past) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
      const repeat = Object.entries(counts).filter(([k, n]) => n > 1 && k !== "top_score");
      if (repeat.length) out.push(`  repeat offender: ${repeat.map(([k, n]) => `${k} x${n}`).join(", ")}`);
    } else {
      out.push("  rap sheet: clean, until now");
    }
    const hit = jokes.filter((j) => j.target === id);
    if (hit.length) {
      out.push("  jokes already used on them:");
      for (const j of hit) out.push(`    - wk ${j.week} [${j.slot}${j.premise ? `: ${j.premise}` : ""}] ${j.text}`);
    }
    out.push("");
  }

  out.push("## Everyone else (for callbacks)", "");
  for (const m of d.managers ?? []) {
    if (!m.ownerId || inNews.has(m.ownerId)) continue;
    const p = members[m.ownerId] ?? {};
    const past = rap.filter((r) => r.ownerId === m.ownerId && r.kind !== "top_score");
    const bits = [];
    if (p.status && p.status !== "alive") bits.push(p.status);
    if (past.length) bits.push(past.map((r) => `wk${r.week} ${r.kind}${r.player ? ` (${r.player})` : ""}`).join(", "));
    if (p.running_gags?.length) bits.push(`gags: ${p.running_gags.join("; ")}`);
    if (p.off_limits?.length) bits.push(`OFF LIMITS: ${p.off_limits.join("; ")}`);
    out.push(`- ${nameOf(m.ownerId)} (${m.ownerId})${bits.length ? ` - ${bits.join(" | ")}` : ""}`);
  }
  out.push("");

  out.push(`## Every joke already published (${jokes.length}) - do not repeat these or their premise`, "");
  for (const j of jokes) out.push(`- wk ${j.week} [${j.slot}${j.target ? ` → ${nameOf(j.target)}` : ""}${j.premise ? `: ${j.premise}` : ""}] ${j.text}`);
  return out.join("\n");
}

// All jokes this copy.json would publish: what the paper prints, plus the
// email's extra lines.
function candidates(d, copy) {
  const printed = printedJokes(d, resolveCopy(d, copy?.paper ?? null)).map((j) => ({ ...j, source: "paper" }));
  const extra = (copy?.jokes ?? []).map((j) => ({
    slot: j.slot ?? "email",
    target: j.target ?? null,
    premise: j.premise ?? null,
    text: j.text,
    source: "email",
  }));
  return [...printed, ...extra];
}

// ── Sentence frames ─────────────────────────────────────────────────────────
// The word-overlap test above misses the same joke wearing new facts ("Survived
// by $183 and an estate sale" / "Survived by $67 and a resale market"). A frame
// is a sentence with names and numbers blanked out; if a new sentence opens or
// closes the way a printed one did, or one issue leans on the same phrase in two
// slots, it is the same bit again.
const tokens = (sentence, names) => {
  let t = String(sentence ?? "");
  for (const n of names) if (n) t = t.split(n).join(" @ ");
  return t
    .replace(/\$?\d[\d,.]*('s|%)?/g, " # ")
    .replace(/[^A-Za-z@#'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    // capitalised mid-sentence words are names; the sentence's first word is not
    .map((w, i) => (i > 0 && /^[A-Z][a-z]/.test(w) ? "@" : w.toLowerCase()))
    // runs of names collapse to one placeholder
    .filter((w, i, a) => !(w === "@" && a[i - 1] === "@"));
};
const sentences = (text) => String(text ?? "").split(/(?<=[.!?])\s+|\s+-\s+|:\s+/).filter((x) => x.trim());
const real = (gram) => gram.filter((w) => w !== "@" && w !== "#").length;
const FRAME = 4;
function frames(text, names) {
  const out = [];
  for (const s of sentences(text)) {
    const t = tokens(s, names);
    if (t.length < FRAME + 1) continue;
    const open = t.slice(0, FRAME);
    const close = t.slice(-FRAME);
    if (real(open) >= 3) out.push(`open: ${open.join(" ")}`);
    if (real(close) >= 3) out.push(`close: ${close.join(" ")}`);
  }
  return out;
}
const SHINGLE = 5;
function shingles(text, names) {
  const out = new Set();
  for (const s of sentences(text)) {
    const t = tokens(s, names);
    for (let i = 0; i + SHINGLE <= t.length; i++) {
      const g = t.slice(i, i + SHINGLE);
      const content = g.filter((w) => w !== "@" && w !== "#" && !STOP.has(w));
      if (real(g) >= 3 && content.length >= 2) out.add(g.join(" "));
    }
  }
  return out;
}

// Every text slot the live site prints. Anything left empty falls back to a
// canned rotation that readers have already seen, so all of them are required.
const REQUIRED = [
  ["headline.kicker", (p) => p.headline?.kicker],
  ["headline.head", (p) => p.headline?.head],
  ["headline.sub", (p) => p.headline?.sub],
  ["offWire.text", (p) => p.offWire?.text],
  ["offWire.headline", (p) => p.offWire?.headline],
  ["kickoff.nudge", (p) => p.kickoff?.nudge],
  ["kickoff.miss", (p) => p.kickoff?.miss],
  ...["benched", "flop", "fresh", "top", "bottom", "spread", "escape", "chopped", "bigWallet", "tightWallet"].map((k) => [
    `roast.${k}`,
    (p) => p.roast?.[k],
  ]),
  ["value.stealJab", (p) => p.value?.stealJab],
  ["value.stealLine", (p) => p.value?.stealLine],
  ["value.lowballJab", (p) => p.value?.lowballJab],
  ["value.lowballLine", (p) => p.value?.lowballLine],
  ["benchGem", (p) => p.benchGem],
  ["comic", (p) => (Array.isArray(p.comic) && p.comic.length >= 2 ? "x" : "")],
];
const REQUIRED_IF_CHOPPED = [
  ["obituary", (p) => p.obituary],
  ["obituaryNotice", (p) => p.obituaryNotice],
  ["condolences", (p) => (Array.isArray(p.condolences) && p.condolences.length >= 2 ? "x" : "")],
];

// The league chat only reaches the paper through storylines.json, which the
// owner fills by hand. If nothing new has gone in lately the paper would be
// written from stale gossip, so the check refuses.
function chatProblems(d) {
  const lines = readJson(STORYLINES, []);
  const newest = Math.max(0, ...lines.map((s) => Number(s.added_week ?? s.from_week ?? 0)));
  if (newest >= d.week - 1) return [];
  return [
    `STALE CHAT: the newest league-chat storyline is from week ${newest || "never"}, and this is week ${d.week}. ` +
      `Add this week's group-chat drama to league-memory/storylines.json (one entry with "added_week": ${d.week} - ` +
      `a "quiet chat week" entry counts) before publishing.`,
  ];
}

// The site computes its own awards (sleeper.ts), which can differ from
// collect.mjs. Given the live API payload, make sure each card's jab is about
// the manager the card actually names - week 10's lowball jab was not.
function siteProblems(site, paper) {
  const a = site?.gazette?.awards ?? {};
  const slots = [
    ["benchGem", paper.benchGem],
    ["benched", paper.roast?.benched],
    ["flop", paper.roast?.flop],
    ["steal", [paper.value?.stealJab, paper.value?.stealLine].join(" ")],
    ["lowball", [paper.value?.lowballJab, paper.value?.lowballLine].join(" ")],
  ];
  const out = [];
  for (const [k, text] of slots) {
    const team = a[k]?.team;
    const team2 = a[k]?.winner?.team;
    const who = team ?? team2;
    const short = who ? who.split(" - ")[0] : null;
    if (who && text && !String(text).includes(who) && !String(text).includes(short))
      out.push(`[${k}] the live site's ${k} card is about ${who}${a[k]?.player?.name ? ` (${a[k].player.name})` : ""}, but your line never names them`);
  }
  return out;
}

function check(d, copy, site) {
  const members = readJson(MEMBERS, {});
  const past = readJsonl(JOKES).filter((j) => j.week !== d.week);
  const now = candidates(d, copy);
  const problems = [...chatProblems(d)];
  const paper = copy?.paper ?? {};
  // With the live site's awards in hand, a card the site will not print needs
  // no line; without them, every slot is required.
  const sa = site?.gazette?.awards;
  const needs = {
    "roast.benched": "benched",
    "roast.flop": "flop",
    benchGem: "benchGem",
    "value.stealJab": "steal",
    "value.stealLine": "steal",
    "value.lowballJab": "lowball",
    "value.lowballLine": "lowball",
  };
  const required = [...REQUIRED, ...(d.chopped ? REQUIRED_IF_CHOPPED : [])].filter(
    ([slot]) => !sa || !needs[slot] || sa[needs[slot]],
  );
  for (const [slot, get] of required) {
    if (!String(get(paper) ?? "").trim()) problems.push(`[${slot}] is missing - the site would print a canned line readers have seen before`);
  }
  if (site) problems.push(...siteProblems(site, paper));
  const names = [
    ...(d.managers ?? []).flatMap((m) => [m.team, m.displayName]),
    ...Object.values(members).flatMap((m) => [m.display_name, m.real_name, ...(m.teams ?? [])]),
  ]
    .filter((n) => n && n.length > 2)
    .sort((x, y) => y.length - x.length);
  const pastFrames = new Map();
  for (const p of past) for (const f of frames(p.text, names)) if (!pastFrames.has(f)) pastFrames.set(f, p);
  now.forEach((j) => {
    for (const f of frames(j.text, names)) {
      const p = pastFrames.get(f);
      if (p) problems.push(`[${j.slot}] reuses a sentence frame from wk ${p.week} [${p.slot}] (${f}): "${p.text.slice(0, 90)}..."`);
    }
  });
  const seen = new Map();
  now.forEach((j) => {
    for (const g of shingles(j.text, names)) {
      const prev = seen.get(g);
      if (prev && prev !== j.slot) problems.push(`[${j.slot}] repeats the phrase "${g}" already used in [${prev}] this issue - one bit, one slot`);
      else seen.set(g, j.slot);
    }
  });
  const known = new Set((d.managers ?? []).map((m) => m.ownerId));

  now.forEach((j, i) => {
    if (!j.text?.trim()) return problems.push(`[${j.slot}] is empty`);
    if (j.target && !known.has(j.target)) problems.push(`[${j.slot}] target ${j.target} is not a manager in this league`);
    for (const p of past) {
      const s = similarity(j.text, p.text);
      if (s >= SIMILAR) {
        problems.push(`[${j.slot}] "${j.text}"\n    repeats wk ${p.week} [${p.slot}] "${p.text}" (${Math.round(s * 100)}% same)`);
        break;
      }
      if (j.premise && p.premise && j.target && j.target === p.target && norm(j.premise) === norm(p.premise)) {
        problems.push(`[${j.slot}] premise "${j.premise}" was already used on this person in wk ${p.week}`);
        break;
      }
    }
    for (const k of now.slice(0, i)) {
      if (similarity(j.text, k.text) >= SIMILAR) problems.push(`[${j.slot}] duplicates [${k.slot}] in this same issue`);
    }
    // Off-limits topics are off limits in every joke, not just jokes about
    // that person - a gag about someone else can still land on them.
    for (const [id, p] of Object.entries(members)) {
      for (const topic of p.off_limits ?? []) {
        const tw = [...words(topic)];
        if (tw.length && tw.every((w) => words(j.text).has(w)))
          problems.push(`[${j.slot}] touches "${topic}", which is off limits for ${p.real_name || p.display_name || id}`);
      }
    }
  });
  return problems;
}

function record(d, copy) {
  mkdirSync(DIR, { recursive: true });

  const members = readJson(MEMBERS, {});
  for (const m of d.managers ?? []) {
    if (!m.ownerId) continue;
    const p = (members[m.ownerId] ??= blankProfile(m.displayName));
    if (m.displayName) p.display_name = m.displayName;
    p.teams ??= [];
    if (m.team && !p.teams.includes(m.team)) p.teams.push(m.team);
  }
  if (d.chopped?.ownerId && members[d.chopped.ownerId]) members[d.chopped.ownerId].status = `chopped week ${d.week}`;
  writeFileSync(MEMBERS, JSON.stringify(members, null, 2) + "\n");

  const byWeek = (a, b) => a.week - b.week;
  const rap = readJsonl(RAP).filter((r) => r.week !== d.week);
  writeJsonl(RAP, [...rap, ...offences(d)].sort(byWeek));

  const jokes = readJsonl(JOKES).filter((j) => j.week !== d.week);
  const fresh = candidates(d, copy).map(({ slot, target, premise, text, source }) => ({
    week: d.week,
    slot,
    target,
    ...(premise ? { premise } : {}),
    source,
    text,
  }));
  writeJsonl(JOKES, [...jokes, ...fresh].sort(byWeek));

  return `recorded week ${d.week}: ${offences(d).length} rap-sheet rows, ${fresh.length} jokes, ${Object.keys(members).length} members`;
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const [cmd, gazettePath, copyPath, sitePath] = process.argv.slice(2);
if (!cmd || !gazettePath || !["brief", "check", "record"].includes(cmd)) {
  console.error("usage: memory.mjs brief|check|record <gazette.json> [copy.json] [site.json]");
  process.exit(2);
}
const d = JSON.parse(readFileSync(gazettePath, "utf8"));
if (!d.managers) {
  console.error("gazette.json has no managers list - re-run collect.mjs from this branch");
  process.exit(2);
}
const copy = copyPath ? JSON.parse(readFileSync(copyPath, "utf8")) : null;
if (copy?.week != null && copy.week !== d.week) {
  console.error(`copy.json is for week ${copy.week} but gazette.json is week ${d.week}`);
  process.exit(2);
}

if (cmd === "brief") console.log(brief(d));
if (cmd === "check") {
  const site = sitePath ? JSON.parse(readFileSync(sitePath, "utf8")) : null;
  const problems = check(d, copy, site);
  if (problems.length) {
    console.error(`${problems.length} problem(s) - rewrite these and check again:\n`);
    for (const p of problems) console.error(`- ${p}`);
    process.exit(1);
  }
  console.log("ok: nothing repeated, nothing off limits");
}
if (cmd === "record") console.log(record(d, copy));
