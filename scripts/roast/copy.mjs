// The words on the paper that are jokes rather than facts: the lead headline,
// the one-liner under each award card, and the obituary epitaph.
//
// render.mjs prints them; memory.mjs checks them against every joke already
// published so the paper never runs the same gag twice. Both go through
// resolveCopy() so the checker sees exactly what the paper will print.
//
// The routine writes this week's lines into a copy.json (see league-memory/
// README.md). Any slot it leaves out falls back to the canned lines below -
// which rotate by week and therefore DO repeat, so memory.mjs check will flag
// a fallback that has run before.

const money = (n) => `$${Number(n ?? 0).toLocaleString("en-US")}`;
const pts = (n) => (n == null ? "—" : Number(n).toFixed(1));

export const pick = (arr, seed) => arr[seed % arr.length];

export const JABS = {
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
  steal: ["Credit where it is due. Do not get used to it."],
  hoarder: ["FAAB does not accrue interest. Spend it or be buried with it."],
  obituary: ["Lowest score. No appeal. No mercy."],
};

// Who each slot is about, so the joke log can say who has already been hit
// with what.
export const targetOf = (d, slot) => {
  const a = d.awards ?? {};
  switch (slot) {
    case "flop":
    case "benched":
    case "lowball":
    case "steal":
      return a[slot]?.ownerId ?? null;
    case "obituary":
      return d.chopped?.ownerId ?? null;
    default:
      return null;
  }
};

function defaultHeadline(d) {
  const { awards: a, week } = d;
  // Lead with the most absurd thing available, in descending order of shame.
  if (a.overkill && a.overkill.gap >= 50) {
    return {
      kicker: "PROFLIGACY",
      head: `${money(a.overkill.winner.bid)} WHEN THE NEXT BID WAS ${money(a.overkill.losers[0].bid)}`,
      sub: `${a.overkill.winner.team} went ${money(a.overkill.gap)} clear of the field for ${a.overkill.player}. Only the winner pays, and the winner paid.`,
      target: a.overkill.winner.ownerId ?? null,
    };
  }
  if (a.benched) {
    return {
      kicker: "SELF-INFLICTED",
      head: `PAID ${money(a.benched.bid)}. STARTED SOMEONE ELSE.`,
      sub: `${a.benched.team} bought ${a.benched.player}, watched him post ${pts(a.benched.points)}, and did it from the bench.`,
      target: a.benched.ownerId ?? null,
    };
  }
  if (a.flop) {
    return {
      kicker: "BUYER'S REMORSE",
      head: `${money(a.flop.bid)} BUYS ${pts(a.flop.points)} POINTS`,
      sub: `${a.flop.team} on ${a.flop.player}. The receipts are public. The shame is permanent.`,
      target: a.flop.ownerId ?? null,
    };
  }
  return {
    kicker: `WEEK ${week}`,
    head: "A QUIET WEEK FOR ONCE",
    sub: "No one distinguished themselves. Try harder.",
    target: null,
  };
}

// override = the `paper` object from copy.json, or null for the canned paper.
export function resolveCopy(d, override) {
  const o = override ?? {};
  const week = d.week;
  const h = defaultHeadline(d);
  const headline = o.headline
    ? { kicker: o.headline.kicker ?? h.kicker, head: o.headline.head ?? h.head, sub: o.headline.sub ?? h.sub, target: o.headline.target ?? h.target }
    : h;
  const line = (slot) => o.jabs?.[slot] ?? pick(JABS[slot], week);
  return {
    headline,
    jabs: {
      flop: line("flop"),
      benched: line("benched"),
      lowball: line("lowball"),
      steal: line("steal"),
      hoarder: line("hoarder"),
    },
    obituary: o.obituary ?? pick(JABS.obituary, week),
  };
}

// Every joke the paper will actually print this week, one row per slot. Slots
// whose card is not on the paper (no award that week) are left out.
export function printedJokes(d, copy) {
  const a = d.awards ?? {};
  const rows = [
    { slot: "headline", target: copy.headline.target ?? null, text: `${copy.headline.head} — ${copy.headline.sub}` },
  ];
  for (const slot of ["flop", "benched", "lowball", "steal"]) {
    if (a[slot]) rows.push({ slot, target: targetOf(d, slot), text: copy.jabs[slot] });
  }
  // Aimed at a group, so no single target.
  if (a.hoarder) rows.push({ slot: "hoarder", target: null, text: copy.jabs.hoarder });
  if (d.chopped) rows.push({ slot: "obituary", target: targetOf(d, "obituary"), text: copy.obituary });
  return rows;
}
