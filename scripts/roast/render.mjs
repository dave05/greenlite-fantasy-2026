#!/usr/bin/env node
// Turn collect.mjs output into THE GUILLOTINE GAZETTE - a one-page tabloid.
//
//   node collect.mjs --week 2 | node render.mjs > gazette.html
//
// Designed for print first, because the deliverable is a PDF: real newsprint
// colours, heavy condensed headlines, and everything laid out to fit a single
// A4 page at Chrome's default print scale. A few subtle animations are included
// for the on-screen version; they simply don't fire in the PDF.

const read = async () => {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => `$${Number(n ?? 0).toLocaleString("en-US")}`;
const pts = (n) => (n == null ? "—" : Number(n).toFixed(1));

// Rotating jabs so a weekly paper doesn't read identically every week. Seeded
// by week number, so the same week always renders the same paper.
const pick = (arr, seed) => arr[seed % arr.length];

function headline(d) {
  const { awards: a, week } = d;
  // Lead with the most absurd thing available, in descending order of shame.
  if (a.overkill && a.overkill.gap >= 50) {
    return {
      kicker: "PROFLIGACY",
      head: `${money(a.overkill.winner.bid)} FOR A MAN WHO COST ${money(a.overkill.losers[0].bid + 1)}`,
      sub: `${a.overkill.winner.team} torches ${money(a.overkill.gap)} of FAAB it did not have to spend on ${a.overkill.player}. Nobody else was close. Nobody else needed to be.`,
    };
  }
  if (a.benched) {
    return {
      kicker: "SELF-INFLICTED",
      head: `PAID ${money(a.benched.bid)}. STARTED SOMEONE ELSE.`,
      sub: `${a.benched.team} bought ${a.benched.player}, watched him post ${pts(a.benched.points)}, and did it from the bench.`,
    };
  }
  if (a.flop) {
    return {
      kicker: "BUYER'S REMORSE",
      head: `${money(a.flop.bid)} BUYS ${pts(a.flop.points)} POINTS`,
      sub: `${a.flop.team} on ${a.flop.player}. The receipts are public. The shame is permanent.`,
    };
  }
  return {
    kicker: `WEEK ${week}`,
    head: "A QUIET WEEK FOR ONCE",
    sub: "No one distinguished themselves. Try harder.",
  };
}

// --fonts=system builds the emailed PDF from fonts every PDF reader already
// has (Times/Helvetica), which takes the file from ~440KB to ~30KB. --fonts=web
// keeps the Google families for the on-screen version, where weight is free.
const FONTS = (process.argv.find((a) => a.startsWith("--fonts=")) ?? "--fonts=web").split("=")[1];
const webFonts = FONTS !== "system";
// Emoji pull a full colour-emoji font into the PDF (~250KB for two glyphs).
const emoji = (glyph, fallback = "") => (webFonts ? glyph : fallback);

const fontLink = webFonts
  ? `<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Roboto+Condensed:wght@400;700&display=swap" rel="stylesheet">`
  : "";
const serifStack = webFonts ? `"Playfair Display", Georgia, serif` : `Georgia, "Times New Roman", Times, serif`;
const condStack = webFonts ? `"Oswald", sans-serif` : `Helvetica, Arial, sans-serif`;
const bodyStack = webFonts ? `"Roboto Condensed", system-ui, sans-serif` : `Helvetica, Arial, sans-serif`;

function page(d) {
  const { awards: a, totals: t, week } = d;
  const h = headline(d);
  const top = d.scores?.[0];
  const bottom = d.scores?.[d.scores.length - 1];

  const jab = {
    overkill: [
      "An auction is not a charity gala.",
      "The second-highest bid was the price. You paid the tip on top.",
      "Someone explain sealed bids to this man.",
    ],
    flop: [
      "Refunds are not a feature of this league.",
      "That is real money, spent on a real person, who did really nothing.",
      "A dollar a point would have been a bargain by comparison.",
    ],
    benched: [
      "BRO. WHY.",
      "Bought the man. Benched the man. Bold.",
      "The most expensive bench warmer in the league.",
    ],
    lowball: [
      "Bold of you to think that would clear.",
      "That is not a bid, that is a rounding error.",
      "Somewhere, a waiver processor laughed.",
    ],
    robbed: [
      "Bid more. Lost anyway. Budget is a cruel master.",
      "Outbid the field and still went home empty.",
      "The only thing worse than losing is losing while winning.",
    ],
  };

  const card = (cls, tag, title, body, foot) => `
    <article class="card ${cls}">
      <div class="tag">${esc(tag)}</div>
      <h3>${title}</h3>
      <p>${body}</p>
      ${foot ? `<div class="jab">${esc(foot)}</div>` : ""}
    </article>`;

  const cards = [];

  if (a.flop)
    cards.push(
      card(
        "bad",
        "The Flop",
        `${esc(a.flop.team)}`,
        `${money(a.flop.bid)} on <b>${esc(a.flop.player)}</b> ${a.flop.meta?.pos ? `(${esc(a.flop.meta.pos)})` : ""} returned <b>${pts(a.flop.points)}</b> points. That is <b>${money((a.flop.bid / Math.max(0.1, a.flop.points)).toFixed(0))}</b> per point.`,
        pick(jab.flop, week),
      ),
    );

  if (a.benched)
    cards.push(
      card(
        "bad",
        "Bench Warmer",
        `${esc(a.benched.team)}`,
        `Won <b>${esc(a.benched.player)}</b> for ${money(a.benched.bid)}, then left him on the bench while he scored <b>${pts(a.benched.points)}</b>.`,
        pick(jab.benched, week),
      ),
    );

  if (a.robbed)
    cards.push(
      card(
        "odd",
        "Robbed",
        `${esc(a.robbed.losers[0].team)}`,
        `Bid <b>${money(a.robbed.losers[0].bid)}</b> on ${esc(a.robbed.player)} and <b>lost</b> to a ${money(a.robbed.winner.bid)} bid from ${esc(a.robbed.winner.team)}. Budget rules are undefeated.`,
        pick(jab.robbed, week),
      ),
    );

  if (a.lowball)
    cards.push(
      card(
        "cheap",
        "Penny Pincher",
        `${esc(a.lowball.team)}`,
        `Offered <b>${money(a.lowball.bid)}</b> for ${esc(a.lowball.player)}. It went for ${money(
          (d.contests.find((c) => c.player === a.lowball.player)?.winner?.bid) ?? "—",
        )}.`,
        pick(jab.lowball, week),
      ),
    );

  if (a.steal)
    cards.push(
      card(
        "good",
        "Actual Genius",
        `${esc(a.steal.team)}`,
        `Paid ${money(a.steal.bid)} for <b>${esc(a.steal.player)}</b>, got <b>${pts(a.steal.points)}</b>. The only defensible transaction of the week.`,
        "Credit where it is due. Do not get used to it.",
      ),
    );

  const contestRows = (d.contests ?? [])
    .slice(0, 6)
    .map(
      (c) => `
      <tr>
        <td class="p">${esc(c.player)}</td>
        <td class="w">${esc(c.winner.team)}</td>
        <td class="n win">${money(c.winner.bid)}</td>
        <td class="l">${esc(c.losers[0]?.team ?? "—")}</td>
        <td class="n">${c.losers[0] ? money(c.losers[0].bid) : "—"}</td>
        <td class="n">${pts(c.points)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>The Guillotine Gazette - Week ${week}</title>
${fontLink}
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #d9d3c3; color: #14110d;
    font-family: ${bodyStack};
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  /* One page, always. A second sheet of mostly-blank newsprint is not a paper.
     The content runs a little over A4, and every block is break-inside: avoid,
     so instead of splitting awkwardly the tail would jump to page 2 wholesale.
     Scaling the sheet is the honest fix: nothing is dropped, it just prints
     slightly smaller. */
  /* The repeating newsprint gradient is lovely on screen and catastrophic in
     print: Chrome rasterises it into a full-page bitmap, which was most of a
     300KB PDF. Print gets the flat stock instead. */
  @media print {
    body { background: #fff; }
    .paper { zoom: 0.86; box-shadow: none; background: #efe9da; }
  }
  .paper { page-break-after: avoid; }
  .paper {
    width: 190mm; margin: 0 auto; padding: 6mm 7mm 7mm;
    background:
      repeating-linear-gradient(0deg, rgba(0,0,0,0.014) 0 2px, transparent 2px 4px),
      #efe9da;
    box-shadow: 0 2mm 8mm rgba(0,0,0,0.25);
  }
  /* ── masthead ─────────────────────────────────────────────── */
  .rule { border-top: 2px solid #14110d; }
  .rule.thin { border-top: 1px solid #14110d; }
  .masthead { text-align: center; padding: 1mm 0 2mm; }
  .masthead h1 {
    font-family: ${serifStack}; font-weight: 900;
    font-size: 35pt; line-height: 0.92; margin: 0.8mm 0 0.8mm; letter-spacing: -0.5pt;
  }
  .masthead .axe { font-size: 26pt; vertical-align: -2pt; }
  .dateline {
    display: flex; justify-content: space-between; font-size: 7.5pt;
    text-transform: uppercase; letter-spacing: 1.4pt; padding: 1mm 0;
  }
  /* ── lead story ───────────────────────────────────────────── */
  .lead { padding: 2mm 0 1.5mm; text-align: center; }
  .kicker {
    font-family: ${condStack}; font-size: 8.5pt; letter-spacing: 3pt;
    color: #8c1c13; text-transform: uppercase;
  }
  .lead h2 {
    font-family: ${condStack}; font-weight: 700; text-transform: uppercase;
    font-size: 27pt; line-height: 0.94; margin: 1.2mm 0 1.6mm; letter-spacing: -0.3pt;
  }
  .lead p { font-size: 10pt; line-height: 1.35; margin: 0 auto; max-width: 150mm; }
  .lead .drop::first-letter {
    font-family: ${serifStack}; font-size: 26pt; font-weight: 900;
    float: left; line-height: 0.8; padding: 1mm 1.5mm 0 0; color: #8c1c13;
  }
  /* ── numbers strip ────────────────────────────────────────── */
  .strip { display: flex; margin: 2.5mm 0; border: 2px solid #14110d; }
  .strip div { flex: 1; text-align: center; padding: 1.8mm 1mm; border-right: 1px solid #14110d; }
  .strip div:last-child { border-right: 0; }
  .strip .n { font-family: ${condStack}; font-size: 17pt; font-weight: 700; line-height: 1; }
  .strip .k { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 1.1pt; margin-top: 0.8mm; }
  /* ── cards ────────────────────────────────────────────────── */
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 2.2mm; margin: 2.2mm 0; }
  .card { border: 1px solid #14110d; padding: 2mm 2.4mm; background: rgba(255,255,255,0.35); break-inside: avoid; }
  .card .tag {
    font-family: ${condStack}; font-size: 7pt; letter-spacing: 2pt;
    text-transform: uppercase; color: #efe9da; background: #14110d;
    display: inline-block; padding: 0.6mm 1.6mm; margin-bottom: 1.2mm;
  }
  .card.bad .tag { background: #8c1c13; }
  .card.good .tag { background: #1d5c33; }
  .card.cheap .tag { background: #6b5b1f; }
  .card.odd .tag { background: #3b3563; }
  .card h3 { font-family: ${condStack}; font-size: 12.5pt; margin: 0 0 1mm; text-transform: uppercase; }
  .card p { font-size: 8.6pt; line-height: 1.32; margin: 0; }
  .card .jab {
    margin-top: 1.4mm; padding-top: 1.2mm; border-top: 1px dashed rgba(20,17,13,0.35);
    font-style: italic; font-size: 8.4pt; color: #8c1c13;
  }
  /* ── table ────────────────────────────────────────────────── */
  h4.sec {
    font-family: ${condStack}; text-transform: uppercase; letter-spacing: 2.4pt;
    font-size: 8.5pt; margin: 2.4mm 0 1mm; border-bottom: 2px solid #14110d; padding-bottom: 0.8mm;
  }
  table { width: 100%; border-collapse: collapse; font-size: 8pt; break-inside: avoid; }
  th {
    text-align: left; font-family: ${condStack}; font-size: 6.8pt;
    text-transform: uppercase; letter-spacing: 1pt; border-bottom: 1px solid #14110d; padding: 0.8mm 1mm;
  }
  td { padding: 0.9mm 1mm; border-bottom: 1px dotted rgba(20,17,13,0.3); }
  td.n { text-align: right; font-family: ${condStack}; font-variant-numeric: tabular-nums; }
  td.n.win { color: #8c1c13; font-weight: 700; }
  td.p { font-weight: 700; }
  td.l { color: rgba(20,17,13,0.6); }
  /* ── obituary ─────────────────────────────────────────────── */
  .bottom { display: grid; grid-template-columns: 1.6fr 1fr; gap: 3mm; margin-top: 2.5mm; break-inside: avoid; }
  .obit { border: 3px double #14110d; padding: 2.5mm; text-align: center; }
  .obit .rip { font-family: ${condStack}; letter-spacing: 4pt; font-size: 9pt; }
  .obit h3 { font-family: ${serifStack}; font-size: 17pt; margin: 1.2mm 0 0.6mm; }
  .obit .meta { font-size: 8pt; font-style: italic; }
  .obit .stone {
    margin: 1.5mm auto 0; width: 24mm; height: 14mm; border-radius: 13mm 13mm 1mm 1mm;
    background: linear-gradient(#6f6a60, #3a3630); position: relative;
  }
  .obit .stone::after {
    content: "R.I.P."; position: absolute; inset: 0; display: flex;
    align-items: center; justify-content: center; padding-top: 3mm;
    font-family: ${condStack}; font-size: 7.5pt; letter-spacing: 1.5pt;
    color: rgba(255,255,255,0.55);
  }
  .scores li { display: flex; justify-content: space-between; font-size: 7.8pt; padding: 0.5mm 0; border-bottom: 1px dotted rgba(20,17,13,0.25); }
  .scores { list-style: none; margin: 0; padding: 0; columns: 2; column-gap: 4mm; }
  .scores li { break-inside: avoid; }
  .scores .v { font-family: ${condStack}; font-variant-numeric: tabular-nums; }
  .hi { color: #1d5c33; font-weight: 700; }
  .lo { color: #8c1c13; font-weight: 700; }
  .colophon { text-align: center; font-size: 6.8pt; letter-spacing: 1.2pt; text-transform: uppercase; margin-top: 3mm; color: rgba(20,17,13,0.6); }
  /* Screen-only flourish; print ignores it. */
  @media screen { .lead h2 { animation: sway 6s ease-in-out infinite; transform-origin: top center; } }
  @keyframes sway { 0%,100% { transform: rotate(-0.4deg); } 50% { transform: rotate(0.4deg); } }
</style></head>
<body><div class="paper">

  <div class="rule"></div>
  <div class="dateline">
    <span>Week ${week} Dispatch</span><span>The League's Paper of Record</span><span>Price: One Waiver Claim</span>
  </div>
  <div class="rule thin"></div>

  <header class="masthead">
    <h1><span class="axe">${emoji("🪓", "&#9876;")}</span> The Guillotine Gazette</h1>
  </header>
  <div class="rule"></div>

  <section class="lead">
    <div class="kicker">${esc(h.kicker)}</div>
    <h2>${esc(h.head)}</h2>
    <p class="drop">${esc(h.sub)}</p>
  </section>

  <div class="strip">
    <div><div class="n">${money(t.spend)}</div><div class="k">FAAB Judged</div></div>
    <div><div class="n">${t.bidsPlaced}</div><div class="k">Bids Placed</div></div>
    <div><div class="n">${t.bidsLost}</div><div class="k">Bids Denied</div></div>
    <div><div class="n">${money(t.freshSpend ?? 0)}</div><div class="k">Fresh Money</div></div>
    <div><div class="n">${top ? pts(top.points) : "—"}</div><div class="k">Top Score</div></div>
  </div>

  <div class="cards">${cards.join("")}</div>

  <h4 class="sec">The Bidding War · who wanted it, who paid for it</h4>
  <table>
    <thead><tr><th>Player</th><th>Winner</th><th style="text-align:right">Paid</th><th>Runner-up</th><th style="text-align:right">Bid</th><th style="text-align:right">Pts</th></tr></thead>
    <tbody>${contestRows || `<tr><td colspan="6" style="text-align:center;font-style:italic">No contested claims. A peaceful, cowardly week.</td></tr>`}</tbody>
  </table>

  <div class="bottom">
    <div>
      <h4 class="sec">The Scoreboard</h4>
      <ul class="scores">
        ${(d.scores ?? [])
          .map(
            (s, i) => `<li><span>${i === 0 ? emoji("🥇 ", "") : ""}${esc(s.team)}</span><span class="v ${i === 0 ? "hi" : i === d.scores.length - 1 ? "lo" : ""}">${pts(s.points)}</span></li>`,
          )
          .join("")}
      </ul>
    </div>
    <div>
      <h4 class="sec">Obituaries</h4>
      ${
        d.chopped
          ? `<div class="obit">
               <div class="rip">R · I · P</div>
               <h3>${esc(d.chopped.team)}</h3>
               <div class="meta">Chopped in Week ${week} · ${pts(d.chopped.points)} points</div>
               <div class="meta">Lowest score. No appeal. No mercy.</div>
               <div class="stone"></div>
             </div>`
          : `<div class="obit"><div class="rip">R · I · P</div><h3>Nobody</h3><div class="meta">All survived Week ${week}. Disappointing.</div><div class="stone"></div></div>`
      }
    </div>
  </div>

  <div class="colophon">
    Compiled from Sleeper's public record · Week ${week} · ${new Date(d.generatedAt).toUTCString()} · All bids are real. All shame is earned.
  </div>
</div></body></html>`;
}

read()
  .then((d) => process.stdout.write(page(d)))
  .catch((e) => {
    console.error(`render failed: ${e.message}`);
    process.exit(1);
  });
