#!/usr/bin/env node
// Turn collect.mjs output into THE GUILLOTINE ROAST - the exact paper the live
// site shows, rendered to a tall print sheet for the weekly PDF/JPEG.
//
//   node collect.mjs --week 2 | node render.mjs > gazette.html
//
// This is a deliberate 1:1 restyle of src/components/Gazette.tsx so the emailed
// paper matches the website section-for-section: masthead "The Guillotine Roast",
// a Kickoff Bulletin, the marquee lead, the five-stat strip, Off the Wire, the
// Roast Desk, the Value Desk, the bidding tables, the Scoreboard, the framed
// "In Loving Memory" obituary, and the Peanut Gallery comic. If you restyle the
// website, mirror the change here (the two layouts are intentionally twins).
//
// Print-first: real newsprint colours, heavy condensed headlines, laid out as a
// single tall column. The paper runs well past one A4 page now - that is fine,
// the deliverable is a screenshot of the whole sheet, not a one-page PDF.

import { readFileSync } from "node:fs";
import { resolveCopy } from "./copy.mjs";

// --copy=path/to/copy.json swaps in this week's freshly written jokes (see
// league-memory/README.md). Without it the paper uses the canned lines.
const COPY_PATH = (process.argv.find((a) => a.startsWith("--copy=")) ?? "").slice("--copy=".length);
const copyOverride = COPY_PATH ? JSON.parse(readFileSync(COPY_PATH, "utf8")).paper ?? null : null;

const read = async () => {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => `$${Number(n ?? 0).toLocaleString("en-US")}`;
const pts = (n) => (n == null ? "-" : Number(n).toFixed(1));
const perPoint = (bid, p) => money(Math.round(Number(bid) / Math.max(0.1, Number(p ?? 0.1))));

// --fonts=system builds the emailed PDF from fonts every reader already has
// (Georgia/Helvetica), which keeps the file small. --fonts=web keeps the Google
// families for the on-screen version.
const FONTS = (process.argv.find((a) => a.startsWith("--fonts=")) ?? "--fonts=web").split("=")[1];
const webFonts = FONTS !== "system";
const emoji = (glyph, fallback = "") => (webFonts ? glyph : fallback);

const fontLink = webFonts
  ? `<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Roboto+Condensed:wght@400;700&display=swap" rel="stylesheet">`
  : "";
const serifStack = webFonts ? `"Playfair Display", Georgia, serif` : `Georgia, "Times New Roman", Times, serif`;
const condStack = webFonts ? `"Oswald", sans-serif` : `Helvetica, Arial, sans-serif`;
const bodyStack = webFonts ? `"Roboto Condensed", system-ui, sans-serif` : `Helvetica, Arial, sans-serif`;

// Deterministic pick, nudged by the week so a fallback line rotates edition to
// edition - the same trick the live site uses to avoid back-to-back repeats.
const pick = (arr, seed) => arr[Math.abs(Math.floor(seed)) % arr.length];

// ── obituary paragraph + condolences, ported verbatim from ObituaryNotice.tsx
//    so the framed clipping reads identically to the website. ────────────────
const obituaryParagraph = (name, points, week) => {
  const p = Number(points ?? 0).toFixed(1);
  const seed = Math.round(Number(points ?? 0) * 10) + name.length + week * 7;
  return pick(
    [
      `It is with great regret, and considerable laughter, that we announce the passing of ${name}, chopped in Week ${week} at a tragic ${p} points. Initial findings show a fatal overdose of bad start/sit decisions. A memorial will be held in the group chat, where mourners are encouraged to pile on. In lieu of flowers, the family asks only that you please set your lineup. ${name} is survived by a bench that begged to play.`,
      `The league solemnly reports the death of ${name}, found face-down in the basement of the standings with just ${p} points. Cause of death: acute roster mismanagement. While an investigation is ongoing, early reports suggest they simply forgot it was game day. Services will be brief; so was the season.`,
      `We mourn ${name}, ${p} points, chopped in Week ${week} after a long and very public battle with the waiver wire. They leave behind $0 in FAAB well spent and a group chat full of receipts. Viewing will be held every time someone reopens the screenshots.`,
      `${name} was laid to rest in Week ${week}, having posted a heroic ${p} points - roughly what a competent bench scores by accident. Preceded in death by their draft strategy and survived by everyone who benched their kicker on time. Donations may be sent to a fund for people who check the injury report.`,
      `With heavy hearts and light schedules, we announce that ${name} has been chopped in Week ${week} at ${p} points. The deceased is remembered for the trades they never made and the free agents they never claimed. A candlelight vigil will be held the moment someone remembers their team name.`,
    ],
    seed,
  );
};
const CONDOLENCES = [
  { msg: "Gone too soon, spent too much.", from: "The Waiver Wire" },
  { msg: "We lit a candle. It outscored your starters.", from: "The Group Chat" },
  { msg: "In lieu of flowers, we're keeping your FAAB.", from: "The Commissioner" },
  { msg: "You will be missed. Briefly.", from: "Everyone Still Alive" },
  { msg: "Thoughts and prayers - mostly thoughts about how that lineup happened.", from: "The League" },
  { msg: "He fought hard. Against himself, mostly.", from: "A Rival" },
  { msg: "Rest easy. The blade needs a weekend too.", from: "The Executioner" },
  { msg: "So brave. So bad. So gone.", from: "The Standings" },
  { msg: "Heaven gained a bench warmer.", from: "Section 7, Row Chop" },
];
const condolencesFor = (name, points, week) => {
  const seed = Math.round(Number(points ?? 0) * 10) + name.length + week * 3;
  const a = pick(CONDOLENCES, seed);
  const b = pick(CONDOLENCES, seed + 4);
  return a === b ? [a] : [a, b];
};

// ── the Peanut Gallery guy, ported from ComicStrip.tsx (pure SVG). ──────────
const guySvg = (who, mood) => {
  const ink = "#14110d";
  const brow =
    mood === "yell"
      ? { l: "M40 46 L54 50", r: "M66 50 L80 46" }
      : mood === "smug"
        ? { l: "M40 49 L54 49", r: "M66 46 L80 49" }
        : mood === "react"
          ? { l: "M40 45 Q47 41 54 45", r: "M66 45 Q73 41 80 45" }
          : { l: "M40 48 L54 48", r: "M66 48 L80 48" };
  const mouth =
    mood === "yell"
      ? `<ellipse cx="60" cy="74" rx="9" ry="11" fill="${ink}" stroke="none"/>`
      : mood === "talk"
        ? `<ellipse cx="60" cy="73" rx="6" ry="5" fill="${ink}" stroke="none"/>`
        : mood === "smug"
          ? `<path d="M49 73 Q60 81 71 72"/>`
          : `<path d="M50 76 Q60 70 70 76"/>`;
  const head =
    who === "a"
      ? `<path d="M31 52 A30 30 0 0 1 89 52 Z" fill="${ink}" stroke="none"/><circle cx="60" cy="38" r="2.5" fill="#fff" stroke="none"/>`
      : `<path d="M33 44 L38 26 L46 42 L54 22 L62 42 L70 24 L78 42 L86 46" fill="${ink}" stroke="${ink}" stroke-width="2"/>`;
  return `<svg viewBox="0 0 120 150" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" role="img" aria-hidden="true">
    <g fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 150 V126 Q18 104 44 100 H76 Q102 104 102 126 V150" fill="#fff"/>
      <path d="M50 100 L60 110 L70 100"/><path d="M60 110 V150"/>
      <path d="M52 96 V86 M68 96 V86"/>
      <circle cx="60" cy="60" r="30" fill="#fff"/>
      <circle cx="49" cy="58" r="2.4" fill="${ink}" stroke="none"/>
      <circle cx="71" cy="58" r="2.4" fill="${ink}" stroke="none"/>
      <path d="${brow.l}"/><path d="${brow.r}"/>
      ${mouth}
      ${head}
    </g>
  </svg>`;
};
const comicPanel = (line) => `
  <div class="panel">
    <div class="bubble"><p>${esc(line.text)}</p></div>
    <div class="tail ${line.who === "a" ? "left" : "right"}"></div>
    <div class="guy ${line.who === "a" ? "left" : "right"}">${guySvg(line.who, line.mood ?? "talk")}</div>
  </div>`;

function page(d) {
  const { awards: a = {}, totals: t = {}, week } = d;
  const copy = resolveCopy(d, copyOverride);
  const h = copy.headline;
  const scores = d.scores ?? [];
  const top = scores[0];
  const bottom = scores[scores.length - 1];
  const secondLast = scores.length >= 2 ? scores[scores.length - 2] : null;
  const escapeMargin = secondLast && bottom ? secondLast.points - bottom.points : null;
  const beatdownGap = top && bottom ? top.points - bottom.points : null;
  const freshRoast = (d.freshContests ?? [])[0] ?? null;

  // Spending: use the editor/collect figures if present, else derive from faab.
  const aliveRosters = (d.faab?.rosters ?? []).filter((r) => r.alive);
  const topSpender =
    d.spending?.topSpender ??
    (aliveRosters.length ? [...aliveRosters].sort((x, y) => (y.spent ?? 0) - (x.spent ?? 0))[0] : null);
  const cheapest =
    d.spending?.cheapest ??
    (aliveRosters.filter((r) => (r.points ?? 0) > 0).length
      ? [...aliveRosters].filter((r) => (r.points ?? 0) > 0).sort((x, y) => (x.spent ?? 0) - (y.spent ?? 0))[0]
      : null);
  const spentOf = (r) => (r == null ? 0 : r.used ?? r.spent ?? 0);

  // ── Roast Desk lines: editor copy first (copy.paper.roast.<slot>), then a
  //    factual fallback so the desk is never blank. ──────────────────────────
  const rc = copyOverride?.roast ?? {};
  const deskLine = (slot, fallback) => (rc[slot] ? esc(rc[slot]) : fallback);
  const desk = [];
  if (a.benched)
    desk.push([
      "Clipboard criminal",
      deskLine(
        "benched",
        `${esc(a.benched.team)} paid ${money(a.benched.bid)} for ${esc(a.benched.player)} and benched him while he scored ${pts(a.benched.points)}. Bought the Ferrari to keep it in the garage.`,
      ),
    ]);
  if (a.flop)
    desk.push([
      "Financial misconduct",
      deskLine(
        "flop",
        `${esc(a.flop.team)} dropped ${money(a.flop.bid)} on ${esc(a.flop.player)} for ${pts(a.flop.points)} points - ${perPoint(a.flop.bid, a.flop.points)} a point. Donated the bag, got a receipt, no refunds.`,
      ),
    ]);
  if (freshRoast)
    desk.push([
      "Fresh from the panic room",
      deskLine(
        "fresh",
        `${esc(freshRoast.winner.team)} smashed ${money(freshRoast.winner.bid)} on ${esc(freshRoast.player)} when ${money(freshRoast.losers?.[0]?.bid)} closed it. The wire reopens Wednesday, champ.`,
      ),
    ]);
  if (top)
    desk.push([
      "Victory-lap department",
      deskLine(
        "top",
        `${esc(top.team)} hung ${pts(top.points)} and the ego went supersonic. Certified W - screenshot it before variance drags you back.`,
      ),
    ]);
  if (bottom)
    desk.push([
      "Basement watch",
      deskLine(
        "bottom",
        `${esc(bottom.team)} managed ${pts(bottom.points)}. Respectfully? Cooked. That is not a lineup, that is a group project where nobody showed up.`,
      ),
    ]);
  if (beatdownGap != null && beatdownGap > 0 && top && bottom)
    desk.push([
      "The spread",
      deskLine(
        "spread",
        `${pts(beatdownGap)} points between the week's high (${esc(top.team)}) and low (${esc(bottom.team)}). No opponent needed here - ${esc(bottom.team)} lost to the whole field at once.`,
      ),
    ]);
  if (escapeMargin != null && escapeMargin >= 0 && secondLast)
    desk.push([
      "Closest escape",
      deskLine(
        "escape",
        `${esc(secondLast.team)} dodged the blade by ${pts(escapeMargin)}. Did not win, just was not the biggest clown. Survival by someone else's crashout.`,
      ),
    ]);
  if (d.chopped)
    desk.push([
      "Final notice",
      deskLine(
        "chopped",
        `${esc(d.chopped.team)} scored ${pts(d.chopped.points)}, got chopped, and is now available for unsolicited lineup advice.`,
      ),
    ]);
  if (topSpender && spentOf(topSpender) > 0)
    desk.push([
      "Biggest wallet",
      deskLine(
        "bigWallet",
        `${esc(topSpender.team)} has torched ${money(spentOf(topSpender))} in FAAB this season and is somehow still not running the league. Spending like the budget expires at midnight.`,
      ),
    ]);
  if (cheapest)
    desk.push([
      "Tightest wallet",
      deskLine(
        "tightWallet",
        `${esc(cheapest.team)} has spent ${money(spentOf(cheapest))} in FAAB all year. ${spentOf(cheapest) === 0 ? "Zero. Surviving on vibes and other people's funerals." : "Coupon-clipping through a survival pool."}`,
      ),
    ]);

  // ── Kickoff Bulletin: editor copy, else build a nudge from the real TNF. ───
  const tnf = d.tnf ?? null;
  const game = tnf ? `${tnf.away} at ${tnf.home}` : null;
  const kickoffNudge =
    copyOverride?.kickoff?.nudge ??
    (game
      ? `TNF is ${game}${tnf.short ? ` (${tnf.short})` : ""}. Get your starters set before it kicks or forever hold your excuses.`
      : `Thursday Night Football opens the new week tonight. Fix your lineups before kickoff or become next week's headline.`);
  const kickoffMiss =
    copyOverride?.kickoff?.miss ??
    `Somebody always forgets a starter. Statistically, it is about to be one of you. Don't.`;

  // ── Off the Wire: editor-only (real NFL news). Never fabricated. ──────────
  const wire = copyOverride?.offWire ?? null;

  // ── Peanut Gallery: editor comic, else a generic auction bit. ─────────────
  const comicLines =
    Array.isArray(copyOverride?.comic) && copyOverride.comic.length
      ? copyOverride.comic.slice(0, 4)
      : [
          { who: "a", mood: "talk", text: "I'm being disciplined with FAAB." },
          { who: "b", mood: "smug", text: "Then you saw an RB2." },
          { who: "a", mood: "yell", text: "HE HAS UPSIDE!" },
          { who: "b", mood: "react", text: "Budget: deceased." },
        ];

  // ── tables ────────────────────────────────────────────────────────────────
  const contestRows = (d.contests ?? [])
    .slice(0, 8)
    .map(
      (c) => `<tr>
        <td class="p">${esc(c.player)}</td><td>${esc(c.winner.team)}</td>
        <td class="n win">${money(c.winner.bid)}</td>
        <td class="l">${esc(c.losers?.[0]?.team ?? "-")}</td>
        <td class="n l">${c.losers?.[0] ? money(c.losers[0].bid) : "-"}</td>
        <td class="n">${pts(c.points)}</td></tr>`,
    )
    .join("");
  const overBy = (c) => {
    const mult = c.winner.bid / Math.max(1, c.losers?.[0]?.bid ?? 1);
    return mult >= 2 ? `${Math.round(mult)}x` : `+${money(c.gap)}`;
  };
  const freshRows = (d.freshContests ?? [])
    .slice(0, 8)
    .map((c) => {
      const mult = c.winner.bid / Math.max(1, c.losers?.[0]?.bid ?? 1);
      return `<tr>
        <td class="p">${esc(c.player)}</td><td>${esc(c.winner.team)}</td>
        <td class="n win">${money(c.winner.bid)}</td>
        <td class="l">${esc(c.losers?.[0]?.team ?? "-")}</td>
        <td class="n l">${c.losers?.[0] ? money(c.losers[0].bid) : "-"}</td>
        <td class="n ${mult >= 3 ? "win" : "l"}">${overBy(c)}</td></tr>`;
    })
    .join("");

  // ── obituary clipping ──────────────────────────────────────────────────────
  const obit = d.chopped
    ? (() => {
        const name = d.chopped.team;
        const p = d.chopped.points;
        const initial = String(name).trim().charAt(0).toUpperCase() || "?";
        const cond = condolencesFor(name, p, week)
          .map(
            (c) =>
              `<li>&ldquo;${esc(c.msg)}&rdquo; <span class="from">- ${esc(c.from)}</span></li>`,
          )
          .join("");
        return `<article class="obit">
          <span class="frame"></span><span class="frame inner"></span>
          <span class="floral tl">&#10086;</span><span class="floral tr">&#10086;</span>
          <span class="floral bl">&#10086;</span><span class="floral br">&#10086;</span>
          <div class="obit-in">
            ${FLOURISH}
            <div class="obit-body">
              <div class="portrait">
                <div class="mono"><span>${esc(initial)}</span></div>
                <p class="pname">${esc(name)}</p>
              </div>
              <div class="obit-text">
                <h3>In Loving Memory</h3>
                <p class="chopline">${emoji("🪓 ", "")}Chopped &middot; Week ${week} &middot; ${pts(p)} pts</p>
                <p class="para">${esc(obituaryParagraph(name, p, week))}</p>
                ${copy.obituary ? `<p class="epitaph">&ldquo;${esc(copy.obituary)}&rdquo;</p>` : ""}
                <div class="cond">
                  <p class="cond-h">Condolences from the surviving members</p>
                  <ul>${cond}</ul>
                </div>
              </div>
            </div>
            ${FLOURISH}
          </div>
        </article>`;
      })()
    : `<p class="allsurvive">Everyone survived Week ${week}. The blade is unionized and took the day off.</p>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>The Guillotine Roast - Week ${week}</title>
${fontLink}
<style>
  * { box-sizing: border-box; }
  @page { size: A4; margin: 10mm; }
  body {
    margin: 0; background: #d9d3c3; color: #14110d;
    font-family: ${bodyStack};
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  @media print { body { background: #fff; } .paper { box-shadow: none; } }
  .paper {
    width: 200mm; margin: 0 auto; padding: 6mm 8mm 8mm;
    background:
      repeating-linear-gradient(0deg, rgba(0,0,0,0.014) 0 2px, transparent 2px 4px),
      #efe9da;
    box-shadow: 0 2mm 8mm rgba(0,0,0,0.25);
  }
  .rule { border-top: 2px solid #14110d; }
  .rule.thin { border-top: 1px solid #14110d; }
  .dateline { display: flex; justify-content: space-between; font-size: 8pt; text-transform: uppercase; letter-spacing: 1.4pt; padding: 1mm 0; }
  .subline { text-align: center; font-size: 8pt; font-style: italic; color: rgba(20,17,13,0.6); padding-bottom: 1mm; }
  .masthead { text-align: center; font-family: ${serifStack}; font-weight: 900; font-size: 46pt; line-height: 0.92; letter-spacing: -0.6pt; padding: 2mm 0; margin: 0; }
  .masthead .axe { font-size: 32pt; vertical-align: -2pt; margin-right: 2pt; }
  /* section label + red kicker shared bits */
  .kicker { font-family: ${condStack}; text-transform: uppercase; letter-spacing: 2.6pt; color: #8c1c13; }
  /* Kickoff Bulletin */
  .kickoff { border-top: 2px solid #14110d; border-bottom: 2px solid #14110d; text-align: center; padding: 2.4mm 0; margin: 3mm 0; }
  .kickoff .kicker { font-size: 8.5pt; }
  .kickoff .nudge { font-size: 11.5pt; font-weight: 700; margin: 1.4mm auto 0; max-width: 155mm; line-height: 1.25; }
  .kickoff .miss { font-size: 9.5pt; font-style: italic; color: rgba(20,17,13,0.6); margin: 1mm auto 0; max-width: 155mm; line-height: 1.25; }
  /* lead */
  .lead { text-align: center; padding: 3mm 2mm 1mm; }
  .lead .kicker { font-size: 9pt; letter-spacing: 3pt; }
  .lead h2 { font-family: ${condStack}; font-weight: 700; text-transform: uppercase; font-size: 30pt; line-height: 0.95; margin: 1.4mm 0 1.8mm; letter-spacing: -0.3pt; }
  .lead p { font-size: 11pt; line-height: 1.35; margin: 0 auto; max-width: 160mm; }
  /* numbers strip */
  .strip { display: flex; margin: 3mm 0; border: 2px solid #14110d; }
  .strip div { flex: 1; text-align: center; padding: 2mm 1mm; border-right: 1px solid #14110d; }
  .strip div:last-child { border-right: 0; }
  .strip .n { font-family: ${condStack}; font-size: 19pt; font-weight: 700; line-height: 1; }
  .strip .k { font-size: 7pt; text-transform: uppercase; letter-spacing: 1.1pt; margin-top: 1mm; }
  /* off the wire */
  .wire { border-left: 4px solid #8c1c13; background: rgba(140,28,19,0.06); padding: 2mm 3mm; margin: 3mm 0; break-inside: avoid; }
  .wire .kicker { font-size: 8.5pt; }
  .wire .roast { font-size: 11pt; font-weight: 700; line-height: 1.3; margin: 1mm 0 0; }
  .wire .head { font-size: 9pt; font-style: italic; color: rgba(20,17,13,0.55); margin: 1mm 0 0; }
  /* roast desk */
  .deskhead { border-top: 2px solid #14110d; border-bottom: 2px solid #14110d; padding: 2.4mm 0; margin: 4mm 0 0; display: flex; align-items: flex-end; justify-content: space-between; gap: 3mm; }
  .deskhead .kicker { font-size: 9pt; }
  .deskhead h3 { font-family: ${serifStack}; font-weight: 900; font-size: 19pt; line-height: 1; margin: 0.6mm 0 0; }
  .deskhead .tag { font-family: ${condStack}; font-size: 8pt; text-transform: uppercase; letter-spacing: 1.4pt; text-align: right; }
  .desk { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 7mm; margin: 2.6mm 0 2mm; }
  .desk p { font-size: 11pt; line-height: 1.32; margin: 0; break-inside: avoid; }
  .desk b { font-weight: 700; }
  /* value desk cards */
  h4.sec { font-family: ${condStack}; text-transform: uppercase; letter-spacing: 2.4pt; font-size: 9pt; margin: 4mm 0 1mm; border-bottom: 2px solid #14110d; padding-bottom: 1mm; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-top: 2mm; }
  .card { border: 1px solid rgba(20,17,13,0.8); background: rgba(255,255,255,0.4); padding: 2.4mm 2.8mm; break-inside: avoid; }
  .card .ctag { font-family: ${condStack}; display: inline-block; padding: 0.6mm 2mm; font-size: 8pt; text-transform: uppercase; letter-spacing: 2pt; color: #efe9da; }
  .card.good .ctag { background: #1d5c33; }
  .card.cheap .ctag { background: #6b5b1f; }
  .card h3 { font-family: ${condStack}; text-transform: uppercase; font-size: 14pt; font-weight: 700; margin: 1.4mm 0 1mm; }
  .card p { font-size: 11pt; line-height: 1.3; margin: 0; }
  .card .jab { margin-top: 1.6mm; padding-top: 1.2mm; border-top: 1px dashed rgba(20,17,13,0.3); font-style: italic; font-size: 10pt; color: #8c1c13; }
  /* tables */
  table { width: 100%; border-collapse: collapse; font-size: 10pt; break-inside: avoid; }
  th { text-align: left; font-family: ${condStack}; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1pt; border-bottom: 1px solid #14110d; padding: 1mm; }
  td { padding: 1mm; border-bottom: 1px dotted rgba(20,17,13,0.3); }
  td.n { text-align: right; font-family: ${condStack}; font-variant-numeric: tabular-nums; }
  td.n.win { color: #8c1c13; font-weight: 700; }
  td.p { font-weight: 700; }
  td.l { color: rgba(20,17,13,0.6); }
  .pending { font-size: 9pt; font-style: italic; color: rgba(20,17,13,0.55); margin: 1mm 0 0; }
  /* scoreboard */
  .scores { list-style: none; margin: 1.5mm 0 0; padding: 0; columns: 2; column-gap: 8mm; }
  .scores li { display: flex; justify-content: space-between; font-size: 10pt; padding: 0.6mm 0; border-bottom: 1px dotted rgba(20,17,13,0.25); break-inside: avoid; }
  .scores .rank { color: rgba(20,17,13,0.4); font-variant-numeric: tabular-nums; margin-right: 2mm; }
  .scores .v { font-family: ${condStack}; font-variant-numeric: tabular-nums; }
  .scores .hi { color: #1d5c33; font-weight: 700; }
  .scores .lo { color: #8c1c13; font-weight: 700; }
  /* obituary clipping */
  .obit { position: relative; margin: 3mm auto 0; max-width: 165mm; background: #efe7d3; color: #221d15; padding: 6mm 8mm; box-shadow: 0 6mm 14mm rgba(0,0,0,0.5); break-inside: avoid; }
  .obit .frame { position: absolute; inset: 0; border: 2px solid #221d15; pointer-events: none; }
  .obit .frame.inner { inset: 2mm; border: 1px solid rgba(34,29,21,0.55); }
  .obit .floral { position: absolute; font-size: 15pt; color: rgba(34,29,21,0.75); line-height: 1; }
  .obit .floral.tl { left: 2.5mm; top: 1.5mm; }
  .obit .floral.tr { right: 2.5mm; top: 1.5mm; transform: scaleX(-1); }
  .obit .floral.bl { left: 2.5mm; bottom: 1.5mm; transform: scaleY(-1); }
  .obit .floral.br { right: 2.5mm; bottom: 1.5mm; transform: scale(-1,-1); }
  .obit-in { position: relative; }
  .obit-body { display: flex; gap: 6mm; margin: 3mm 0; }
  .portrait { flex-shrink: 0; text-align: center; }
  .portrait .mono { width: 24mm; height: 24mm; margin: 0 auto; border-radius: 50%; border: 1px solid rgba(34,29,21,0.5); display: flex; align-items: center; justify-content: center; background: radial-gradient(120% 120% at 30% 25%, #cfc6b0 0%, #a99f86 55%, #6f6650 100%); filter: grayscale(1); }
  .portrait .mono span { font-family: ${serifStack}; font-size: 30pt; font-weight: 600; color: rgba(239,231,211,0.9); }
  .portrait .pname { font-family: ${serifStack}; font-style: italic; font-size: 11pt; margin: 2mm 0 0; }
  .obit-text { min-width: 0; }
  .obit-text h3 { font-family: ${serifStack}; font-weight: 600; font-size: 20pt; line-height: 1; margin: 0; }
  .obit-text .chopline { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.8pt; color: #8c1c13; margin: 1mm 0 0; }
  .obit-text .para { font-family: ${serifStack}; font-size: 11pt; line-height: 1.35; margin: 2mm 0 0; color: rgba(34,29,21,0.9); }
  .obit-text .epitaph { font-family: ${serifStack}; font-style: italic; font-size: 10.5pt; margin: 1.5mm 0 0; color: rgba(34,29,21,0.75); }
  .obit-text .cond { margin-top: 2.5mm; border-top: 1px solid rgba(34,29,21,0.25); padding-top: 1.6mm; }
  .obit-text .cond-h { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.8pt; color: rgba(34,29,21,0.55); margin: 0; }
  .obit-text .cond ul { list-style: none; margin: 1mm 0 0; padding: 0; }
  .obit-text .cond li { font-family: ${serifStack}; font-style: italic; font-size: 10pt; line-height: 1.35; color: rgba(34,29,21,0.85); }
  .obit-text .cond .from { font-style: normal; color: rgba(34,29,21,0.55); }
  .flourish { display: flex; align-items: center; justify-content: center; gap: 3mm; color: rgba(70,60,45,0.7); }
  .flourish .fl-line { height: 1px; flex: 1; background: rgba(70,60,45,0.35); }
  .allsurvive { text-align: center; font-size: 10pt; font-style: italic; color: rgba(20,17,13,0.7); }
  /* Peanut Gallery */
  .comic { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 2mm; }
  .panel { position: relative; display: flex; flex-direction: column; border: 1px solid #14110d; background: #fbf8ef; padding: 2mm; min-height: 42mm; overflow: hidden; break-inside: avoid; }
  .panel .bubble { border: 1.5px solid #14110d; background: #fff; border-radius: 4mm; padding: 1.2mm 2mm; z-index: 2; }
  .panel .bubble p { text-align: center; font-size: 8pt; font-weight: 700; text-transform: uppercase; line-height: 1.12; letter-spacing: -0.2pt; margin: 0; }
  .panel .tail { width: 2.4mm; height: 2.4mm; transform: rotate(45deg); border-right: 1.5px solid #14110d; border-bottom: 1.5px solid #14110d; background: #fff; margin-top: -1.2mm; z-index: 1; }
  .panel .tail.left { margin-left: 5mm; }
  .panel .tail.right { margin-left: auto; margin-right: 5mm; }
  .panel .guy { margin-top: auto; height: 20mm; display: flex; }
  .panel .guy.left { justify-content: flex-start; }
  .panel .guy.right { justify-content: flex-end; }
  .panel .guy svg { width: 16mm; height: 20mm; }
  .colophon { text-align: center; font-size: 8pt; text-transform: uppercase; letter-spacing: 1.2pt; color: rgba(20,17,13,0.55); margin-top: 4mm; }
</style></head>
<body><div class="paper">

  <div class="rule"></div>
  <div class="dateline">
    <span>Week ${week} Dispatch</span><span>The League's Paper of Record</span><span>Price: One Waiver Claim</span>
  </div>
  <div class="subline">Bids placed in the Week ${Math.max(1, week - 1)} waiver run &middot; scored in Week ${week}</div>
  <div class="rule thin"></div>

  <h1 class="masthead"><span class="axe">${emoji("🪓", "&#9876;")}</span>The Guillotine Roast</h1>
  <div class="rule"></div>

  <section class="kickoff">
    <p class="kicker">Kickoff Bulletin &middot; next week starts today</p>
    <p class="nudge">${esc(kickoffNudge)}</p>
    <p class="miss">${esc(kickoffMiss)}</p>
  </section>

  <section class="lead">
    <p class="kicker">${esc(h.kicker)}</p>
    <h2>${esc(h.head)}</h2>
    <p>${esc(h.sub)}</p>
  </section>

  <div class="strip">
    <div><div class="n">${money(t.spend)}</div><div class="k">FAAB paid</div></div>
    <div><div class="n">${t.bidsPlaced ?? 0}</div><div class="k">Bids placed</div></div>
    <div><div class="n">${t.bidsLost ?? 0}</div><div class="k">Bids denied</div></div>
    <div><div class="n">${money(t.freshSpend ?? 0)}</div><div class="k">Fresh money</div></div>
    <div><div class="n">${top ? pts(top.points) : "-"}</div><div class="k">Top score</div></div>
  </div>

  ${
    wire
      ? `<div class="wire">
           <p class="kicker">Off the wire${wire.source ? ` &middot; ${esc(wire.source)}` : ""}</p>
           <p class="roast">${esc(wire.text ?? "")}</p>
           ${wire.headline ? `<p class="head">Real headline: &ldquo;${esc(wire.headline)}&rdquo;</p>` : ""}
         </div>`
      : ""
  }

  <div class="deskhead">
    <div>
      <p class="kicker">The Roast Desk</p>
      <h3>Receipts, regrets &amp; roster crimes</h3>
    </div>
    <span class="tag">No manager is safe</span>
  </div>
  <div class="desk">
    ${desk.map(([label, body]) => `<p><b>${esc(label)}:</b> ${body}</p>`).join("")}
  </div>

  ${
    a.steal || a.lowball
      ? `<h4 class="sec">The Value Desk &middot; one genius, one cheapskate</h4>
         <div class="cards">
           ${
             a.steal
               ? `<div class="card good"><span class="ctag">Best Buy</span>
                    <h3>${esc(a.steal.team)}</h3>
                    <p>Paid <b>${money(a.steal.bid)}</b> for <b>${esc(a.steal.player)}</b> and got <b>${pts(a.steal.points)}</b> points out of him. Everyone else spent more and got less.</p>
                    <div class="jab">Exactly one manager in this league owns a calculator. Here they are.</div>
                  </div>`
               : ""
           }
           ${
             a.lowball
               ? `<div class="card cheap"><span class="ctag">Cheapest Offer</span>
                    <h3>${esc(a.lowball.team)}</h3>
                    <p>Offered <b>${money(a.lowball.bid)}</b> for <b>${esc(a.lowball.player)}</b> and lost. It cost nothing, which is roughly what it was worth.</p>
                    <div class="jab">Bidding is a participation sport. You, notably, did not participate.</div>
                  </div>`
               : ""
           }
         </div>`
      : ""
  }

  <h4 class="sec">The Bidding War &middot; Week ${Math.max(1, week - 1)} claims, Week ${week} points</h4>
  <table>
    <thead><tr><th>Player</th><th>Winner</th><th style="text-align:right">Paid</th><th>Next highest</th><th style="text-align:right">Bid (unpaid)</th><th style="text-align:right">Pts</th></tr></thead>
    <tbody>${contestRows || `<tr><td colspan="6" style="text-align:center;font-style:italic">No contested claims. A peaceful, cowardly week.</td></tr>`}</tbody>
  </table>

  ${
    freshRows
      ? `<h4 class="sec">Just In &middot; Week ${week} claims, verdict pending</h4>
         <table>
           <thead><tr><th>Player</th><th>Bought by</th><th style="text-align:right">Paid</th><th>Next highest</th><th style="text-align:right">Bid (unpaid)</th><th style="text-align:right">Over</th></tr></thead>
           <tbody>${freshRows}</tbody>
         </table>
         <p class="pending">These players have not played yet. Next week we find out who was right.</p>`
      : ""
  }

  <h4 class="sec">The Scoreboard</h4>
  <ul class="scores">
    ${scores
      .map(
        (s, i) =>
          `<li><span><span class="rank">${i + 1}</span>${esc(s.team)}</span><span class="v ${i === 0 ? "hi" : i === scores.length - 1 ? "lo" : ""}">${pts(s.points)}</span></li>`,
      )
      .join("")}
  </ul>

  <h4 class="sec">Obituaries</h4>
  ${obit}

  <h4 class="sec">The Peanut Gallery</h4>
  <div class="comic">${comicLines.map(comicPanel).join("")}</div>

  <div class="colophon">The numbers are Sleeper's. The disrespect is ours. &middot; Week ${week} &middot; ${new Date(d.generatedAt ?? Date.now()).toUTCString()}</div>
</div></body></html>`;
}

const FLOURISH = `<div class="flourish"><span class="fl-line"></span><svg width="72" height="14" viewBox="0 0 72 14" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><path d="M2 7c11-8 19 8 34 0M36 7c15 8 23-8 34 0"/><circle cx="36" cy="7" r="1.6" fill="currentColor" stroke="none"/></svg><span class="fl-line"></span></div>`;

read()
  .then((d) => process.stdout.write(page(d)))
  .catch((e) => {
    console.error(`render failed: ${e.message}`);
    process.exit(1);
  });
