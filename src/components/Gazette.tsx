"use client";

import { useCallback, useEffect, useState } from "react";
import type { Gazette as GazetteData, GazetteBid, GazetteContest, TxnPlayer } from "@/lib/sleeper";
import ComicStrip, { type ComicLine } from "./ComicStrip";
import ObituaryNotice from "./ObituaryNotice";
import { profileFor } from "@/lib/leagueProfiles";

// The Guillotine Gazette, rendered live rather than shipped as a flat image.
// Rendering in the browser is why this looks sharp: no JPEG compression, no
// print downscaling, text stays selectable and it reflows on a phone.
//
// Two facts the copy must never get wrong, per the league owner:
//   - A losing bid costs nothing. Only the winning claim is charged, so a
//     runner-up's number is always labelled unpaid.
//   - The highest valid bid always wins. The API already discards failed claims
//     that merely carried a larger number, so nothing here can imply an upset.

type Tnf = { short: string; away: string; home: string; kickoff: number };
type Payload = {
  connected: boolean;
  week: number;
  lastCompleted: number;
  currentWeek: number;
  tnf: Tnf | null;
  gazette: GazetteData | null;
};

const money = (n: number | null | undefined) =>
  `$${Number(n ?? 0).toLocaleString("en-US")}`;
const pts = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toFixed(1);

// The current issue number, advanced once per edition (set from g.week before
// any copy is built). Every pick() is nudged by it, so a joke that ran last week
// rotates to the next line this week - a senior editor reading the back issues
// before signing off, automatically. Stays deterministic per render, so no
// hydration flicker.
let ISSUE_SHIFT = 0;

// Deterministic pick so the burn is varied across teams but stable per render.
const pick = <T,>(arr: T[], seed: number) =>
  arr[Math.abs(Math.floor(seed + ISSUE_SHIFT)) % arr.length];

// Weaponize the team's own name. Hand-written zingers for the punny names in
// both leagues; a generic name-quoting fallback for everyone else so the joke
// always references the actual team.
const NAME_JABS: { match: string; jabs: string[] }[] = [
  { match: "just survive now", jabs: ["For a team called “Just Survive Now,” that's a lot of financial dying.", "Just Survive Now? At those prices, survive the FAAB bill first."] },
  { match: "on burrowed time", jabs: ["“On Burrowed Time” indeed - that budget won't see Thanksgiving.", "Living on borrowed time and now borrowed money."] },
  { match: "purdy good team", jabs: ["“Purdy Good Team,” purdy questionable math.", "Purdy good name. Purdy rough spreadsheet."] },
  { match: "shake and bake", jabs: ["All shake, no bake.", "Shake and Bake? That was pure shake."] },
  { match: "mahome", jabs: ["The Mahome-boys just got taken to school.", "No place like Mahome, no plan like no plan."] },
  { match: "coco bongo", jabs: ["Coco Bongo's Finest? Finest at overpaying, sure.", "Coco Bongo's Finest hour this was not."] },
  { match: "what's a down", jabs: ["“What's a Down?” Apparently so is a budget.", "What's a Down? Ask the FAAB account."] },
  { match: "pump up the jam", jabs: ["Pump Up The Jam? Pump the brakes.", "That bid was pumped up. The roster, less so."] },
  { match: "spider", jabs: ["With great FAAB comes great irresponsibility.", "Spidey sense: completely offline."] },
  { match: "shudawgs", jabs: ["Shudawgs? Shoulda saved.", "Every dog has its day. This wasn't it."] },
  { match: "burrowed", jabs: ["Borrowed time, borrowed money, same energy."] },
];

// Teams whose label is just the manager's Sleeper username. Set from each
// payload before rendering (see Gazette below); a username is not a team name,
// so "a team literally named sergioflores98" is not a joke.
const plainNames = new Set<string>();

const teamPun = (team: string): string => {
  const key = team.toLowerCase();
  // First: a real dossier jab (fandom / identity) from the in-app profiles, so
  // the site itself "remembers" who these managers are. Then punny-name jabs,
  // then a generic fallback.
  const prof = profileFor(team);
  if (prof && prof.jabs.length) return pick(prof.jabs, team.length);
  const hit = NAME_JABS.find((n) => key.includes(n.match));
  if (hit) return pick(hit.jabs, team.length);
  if (plainNames.has(team))
    return pick(
      [
        "The group chat has been notified.",
        "Screenshots have already been taken.",
        "This one goes in the league's permanent record.",
      ],
      team.length,
    );
  return pick(
    [
      `Bold move for a team literally named “${team}.”`,
      `Whatever “${team}” was going for, this wasn't it.`,
      `“${team}” will not be putting this one in the highlight reel.`,
    ],
    team.length,
  );
};

const roastScore = (team: string, points: number, place: "first" | "last") => {
  const seed = points * 10 + team.length;
  if (place === "first") {
    return pick(
      [
        `${team} dropped ${pts(points)} and the ego went supersonic. W for now, but you're one bad week from the chat forgetting your name.`,
        `${team} hung ${pts(points)}. Certified W. Screenshot it before variance drags you back to the shadow realm.`,
        `${team} put up ${pts(points)} and immediately typed "it's called strategy" in the chat. Nobody asked, king.`,
        `${team} posted ${pts(points)}. Cooked the whole field. Also cooked us all with the victory lap that's incoming.`,
      ],
      seed,
    );
  }
  return pick(
    [
      `${team} put up ${pts(points)}. Respectfully? Cooked. Washed. Donated the entire week. ${teamPun(team)}`,
      `${team} scored ${pts(points)}, a goose egg with extra steps. The bench is malding and wants out. ${teamPun(team)}`,
      `${team} managed ${pts(points)}. Chat, is this real? That's not a lineup, that's a group project where nobody showed up.`,
      `${team} bricked at ${pts(points)}. -10000 aura. Their draft board is filing a restraining order as we speak. ${teamPun(team)}`,
    ],
    seed,
  );
};

const roastContest = (c: GazetteContest) => {
  const runner = c.runnerUp;
  const ratio = c.winner.bid / Math.max(1, runner?.bid ?? 1);
  const seed = c.winner.bid + c.winner.team.length;
  if (ratio >= 20) {
    return pick(
      [
        `${c.winner.team} smashed ${money(c.winner.bid)} for ${c.player.name}. Next human bid? ${money(runner?.bid)}. Bro was bidding against the voices in his head and STILL fumbled the bag.`,
        `Nobody wanted ${c.player.name}. Not one soul. ${c.winner.team} dropped ${money(c.winner.bid)} anyway. The audacity. Financial advisor has left the chat.`,
        `${c.winner.team} ratio'd himself: ${money(c.winner.bid)} for ${c.player.name} when ${money(runner?.bid)} closed it. Certified bag fumble, hung in the museum of L's.`,
      ],
      seed,
    );
  }
  if (ratio >= 5) {
    return pick(
      [
        `${c.winner.team} turned a ${money(runner?.bid)} player into a ${money(c.winner.bid)} hostage situation over ${c.player.name}. He better go nuclear or it's crashout season.`,
        `${c.winner.team} panic-smashed ${money(c.winner.bid)} on ${c.player.name} like waivers were closing forever. They reopen Wednesday, champ. Down bad behavior.`,
      ],
      seed,
    );
  }
  return pick(
    [
      `${c.winner.team} sniped ${runner?.team ?? "the field"} by ${money(c.gap)} for ${c.player.name}. Petty-king behavior and honestly? We respect the malice.`,
      `${c.winner.team} edged ${runner?.team ?? "the room"} by ${money(c.gap)} for ${c.player.name}. A rivalry was born; a friendship got ratio'd.`,
    ],
    seed,
  );
};

const roastBench = (bid: GazetteBid) =>
  pick(
    [
      `${bid.team} paid ${money(bid.bid)} for ${bid.player.name} and BENCHED him. ${pts(bid.points)} points admired from the couch. Bought the Ferrari to keep it in the garage. Clown behavior. ${teamPun(bid.team)}`,
      `${bid.team} spent ${money(bid.bid)} to watch ${bid.player.name} go for ${pts(bid.points)} in street clothes. Fumbled the bag AND the wallet. No cap, diabolical.`,
      `${bid.team} bought ${bid.player.name} for ${money(bid.bid)} and sat him. Paid for premium, unplugged the TV. The lineup did you dirty and you let it. ${teamPun(bid.team)}`,
    ],
    bid.bid + bid.team.length,
  );

const roastBenchGem = (bg: { team: string; player: TxnPlayer; points: number }) =>
  pick(
    [
      `${bg.team} left ${bg.player.name} (${pts(bg.points)}) ON THE BENCH. Chat, is this real? That's keeping the winning lotto ticket as a bookmark. ${teamPun(bg.team)}`,
      `${bg.player.name} went OFF for ${pts(bg.points)} in a hoodie for ${bg.team}. Benching him was a full crashout. -aura, no notes.`,
      `${bg.team} had ${bg.player.name} and his ${pts(bg.points)} sitting on the bench and started someone else. The points were in the building. The doors were locked from the inside.`,
      `${bg.team} benched ${pts(bg.points)}. Own that number. Frame it. That is a start/sit crime with witnesses.`,
    ],
    Math.round(bg.points * 10) + bg.team.length,
  );

const roastEscape = (team: string, margin: number) =>
  pick(
    [
      `${team} dodged the blade by ${pts(margin)}. Didn't win, just wasn't the biggest clown. Survival by vibes and someone else's crashout.`,
      `${team} lives by ${pts(margin)}. No skill, no plan, pure "someone had to be worse." Touch grass and go thank them.`,
      `${team} escaped by ${pts(margin)}. Smoke alarm went off, they woke up, the house still reeks. Barely-a-W behavior.`,
    ],
    Math.round(margin * 10) + team.length,
  );

// The Guillotine has NO head-to-head matchups - everyone plays the scoreboard and
// the lowest score is chopped. So this is the week's high-vs-low SPREAD across the
// whole field, never "X beat Y" (they never played).
const roastBeatdown = (top: string, bottom: string, gap: number) =>
  pick(
    [
      `${pts(gap)} points between the week's high (${top}) and the week's low (${bottom}). Same board, different tax bracket. ${bottom} didn't lose to anyone - they lost to the whole field at once.`,
      `${top} topped the slate; ${bottom} sank ${pts(gap)} below it. No opponent needed in this league - the scoreboard did the bodying and ${bottom} volunteered.`,
      `${top} led the field, ${bottom} anchored it, ${pts(gap)} apart. In the Guillotine you race the board, and ${bottom} raced it straight into the shadow realm.`,
    ],
    Math.round(gap * 10) + top.length,
  );

const roastFlop = (bid: GazetteBid) => {
  const cost = Math.round(bid.bid / Math.max(0.1, bid.points ?? 0.1));
  return pick(
    [
      `${bid.team} dropped ${money(bid.bid)} on ${bid.player.name} for ${pts(bid.points)} points. That's ${money(cost)} a point. Donated the bag, got a receipt, no refunds.`,
      `${bid.team} invested ${money(bid.bid)} in ${bid.player.name}, cashed out ${pts(bid.points)}. ${money(cost)} per point is not a bid, it's a cry for help. Down bad.`,
      `${money(bid.bid)} on ${bid.player.name} for ${pts(bid.points)}? ${teamPun(bid.team)} ${money(cost)} a point before emotional damages. Get bodied by your own waiver claim.`,
    ],
    bid.bid + bid.team.length,
  );
};

// Off the wire: the editor read the actual NFL news and tied it to a team's
// week. Three lanes per category - "doomed" (chopped/bottom), "spender" (paid
// real FAAB for this guy: marquee/flop/bigSpender/benched), and default - so the
// burn actually connects the headline to what that manager did.
type NewsHook = NonNullable<GazetteData["newsHook"]>;
const wireRoast = (n: NewsHook): string => {
  const { team, player, position, nflTeam, category, role } = n;
  const doomed = role === "chopped" || role === "bottom";
  // The role is the TEAM's; the spender lines say they paid for THIS player, so
  // they need a real winning claim on him.
  const spender =
    n.paidFor && (role === "marquee" || role === "flop" || role === "bigSpender" || role === "benched");
  const lane = doomed ? "doomed" : spender ? "spender" : "base";
  const pos = position ? `${position} ` : "";
  const nfl = nflTeam ? ` (${nflTeam})` : "";
  const seed = player.length + team.length;

  const pools: Record<NewsHook["category"], Record<"doomed" | "spender" | "base", string[]>> = {
    injury: {
      doomed: [
        `Brutal week for ${team}: chopped AND their ${pos}${player} hits the injury report. ${team} would donate a knee if Sleeper let you trade ligaments.`,
        `${player} went down and dragged ${team} into the grave with him. That's not variance, that's a crime scene.`,
      ],
      spender: [
        `${team} spent real money on ${player}, who is now shopping for crutches${nfl ? ` in ${nflTeam}` : ""}. FAAB well invested, truly.`,
        `Injury update: ${player} is hurt, and so is ${team}'s cap sheet. You bought the guy AND the ambulance ride.`,
      ],
      base: [
        `${player}${nfl} landed on the injury report. ${team} managers, start stretching, you're the depth chart now.`,
        `Injury bug bit ${player}. ${team} acting like there's a Plan B is the best comedy on the wire.`,
      ],
    },
    suspension: {
      doomed: [`${player} got suspended and ${team} got chopped in the same news cycle. When it rains, ${team} forgets the umbrella.`],
      spender: [`${team} paid up for ${player}, who is now in timeout. Bought a starter, got a spectator with a fine.`],
      base: [`${player}${nfl} is suspended. ${team} finding out their guy is benched by the league office is peak this-league energy.`],
    },
    legal: {
      doomed: [`${player} is in the headlines for all the wrong reasons, and ${team} is in the basement for the same. Rough branding week all around.`],
      spender: [`${team} invested in ${player}, who is currently investing in legal representation. Great roster construction.`],
      base: [`${player}${nfl} is making the wrong kind of news. ${team} rostering that headache is a choice.`],
    },
    trade: {
      doomed: [`${player} is on the move${nfl ? ` out of ${nflTeam}` : ""} and ${team} is on the way out of the league. Everybody's relocating.`],
      spender: [`${team} paid a premium for ${player}, who just changed teams${nfl ? ` (bye, ${nflTeam})` : ""}. Buy high, panic higher.`],
      base: [`${player} got dealt${nfl ? ` out of ${nflTeam}` : ""}. ${team} clutching that roster spot like it still means something.`],
    },
    benched: {
      doomed: [`${player} got benched in real life the same week ${team} got benched from the league. Twinning. Devastating.`],
      spender: [`${team} paid for ${player} and the NFL benched him for free. At least somebody made the right call.`],
      base: [`${player}${nfl} lost the starting job. ${team} about to learn what "handcuff" means the hard way.`],
    },
    bigGame: {
      doomed: [`${player} went nuclear and ${team} STILL landed in the basement. Owning the guy isn't enough if you won't start him.`],
      spender: [`${team} paid up for ${player} and he actually delivered. Broken clock, correct twice a season. Frame it.`],
      base: [`${player}${nfl} balled out. ${team} either rode him to glory or benched him for a kicker. Coin flip, knowing this league.`],
    },
    other: { doomed: [], spender: [], base: [] },
  };
  const pool = pools[category][lane];
  return pick(pool.length ? pool : pools[category].base, seed);
};

// The marquee overpay. Scale the ridicule to how shocking the number is: a
// $500 blowout is a different crime than a 40x ghost-auction, so each tier gets
// its own pool of analogies. ISSUE_SHIFT rotates the pick every edition, so
// back-to-back weeks never open with the same line - readers notice when you don't.
const leadCopy = (abs: GazetteContest) => {
  const bid = abs.winner.bid;
  const next = abs.runnerUp?.bid ?? 0;
  const mult = Math.round(bid / Math.max(1, next));
  const team = abs.winner.team;
  const who = abs.player.name;
  const s = bid + next;

  // Tiered analogies - the "Ferrari money, Craigslist futon" energy, but the
  // right flavour for the crime. "Ferrari/futon" lives in exactly one pool.
  const blowout = [
    "Ferrari money for a used golf cart.",
    "That's rent. Gone. On a flex.",
    "A car payment set on fire for warmth.",
    "Enough FAAB to buy the whole league dinner, blown on one guy.",
    "Somewhere an accountant woke up screaming.",
    "A down payment on a house, wagered on a hunch.",
    "That's not a bid, that's a ransom note.",
  ];
  const ghost = [
    "Outbid a mirror and still felt good about it.",
    `Tipped ${mult}x on a coffee nobody ordered.`,
    "Bought the only umbrella during a drought.",
    "Brought a bazooka to a thumb war and overpaid for the bazooka.",
    "Won an auction where the other bidder was a ghost.",
    "Paid cover charge to an empty club.",
    "Spent supercar money to win a tricycle race.",
  ];
  const steep = [
    "Paid express shipping on a very slow man.",
    "Bought the extended warranty on a rental.",
    "Overtipped the valet for parking his own car.",
    "Paid full price at a going-out-of-business sale.",
    "Bought the popcorn combo and skipped the movie.",
  ];
  // "Ferrari money, Craigslist futon" is the paper's signature bit: a fat bid to
  // beat a tiny one. Run it whenever it LITERALLY fits, and keep it off blowouts
  // (a $400 next bid is no futon). Otherwise rotate the tier pool.
  const futonFit = bid >= 50 && next > 0 && next <= 10 && mult >= 5;
  const tier = bid >= 100 ? blowout : mult >= 5 ? ghost : steep;
  const analogy = futonFit ? "Ferrari money, Craigslist futon." : pick(tier, s);

  const kicker = pick(
    [
      "Chat, is this real",
      "Alert the accountant",
      "Certified bag fumble",
      "Financial advisor left the chat",
      "The crashout of the week",
      "No cap, this happened",
    ],
    s + 1,
  );

  // Heads are tier-aware so we never brag about a "1x overpay" on a blowout.
  const headPool =
    bid >= 100
      ? [
          `${money(bid)} for ${who}?! be so fr`,
          `${money(bid)}. On purpose. Out loud.`,
          `${money(bid)} of real FAAB, straight donated`,
          `bro really spent ${money(bid)}`,
        ]
      : [
          `${money(bid)} for a ${money(next)} player, respectfully cooked`,
          `${mult}x for a dude nobody wanted`,
          `paid ${money(bid)}, needed ${money(next)}`,
          `${money(bid)} to beat a ${money(next)} bid, ratio'd himself`,
        ];
  const head = pick(headPool, s + 2);

  const sub = pick(
    [
      `${team} smashed ${money(bid)} for ${who} when ${money(next)} closed it. ${analogy} ${teamPun(team)}`,
      `Nobody else touched ${who} past ${money(next)}. ${team} dropped ${money(bid)} anyway. Bag: fumbled. ${analogy} ${teamPun(team)}`,
      `${team} looked at a ${money(next)} market and said "nah, more." ${money(bid)} for ${who}. Down bad. ${analogy} ${teamPun(team)}`,
      `${team} shoved ${money(bid)} on the table for ${who} when ${money(next)} had it. The audacity. ${analogy} ${teamPun(team)}`,
    ],
    s + 3,
  );
  return { kicker, head, sub };
};

function Card({
  tone,
  tag,
  team,
  children,
  jab,
}: {
  tone: "bad" | "good" | "cheap";
  tag: string;
  team: string;
  children: React.ReactNode;
  jab: string;
}) {
  const tagBg =
    tone === "bad" ? "#8c1c13" : tone === "good" ? "#1d5c33" : "#6b5b1f";
  return (
    <article className="border border-[#14110d]/80 bg-white/40 p-3">
      <span
        className="font-display inline-block px-2 py-[2px] text-[9px] uppercase tracking-[0.2em] text-[#efe9da]"
        style={{ background: tagBg }}
      >
        {tag}
      </span>
      <h3 className="font-display mt-2 text-lg font-bold uppercase leading-none">
        {team}
      </h3>
      <p className="mt-1.5 text-[13px] leading-snug">{children}</p>
      <p className="mt-2 border-t border-dashed border-[#14110d]/30 pt-1.5 text-[12px] italic text-[#8c1c13]">
        {jab}
      </p>
    </article>
  );
}

export default function Gazette() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [week, setWeek] = useState<number | null>(null);

  const load = useCallback(async (w: number | null) => {
    try {
      setErr(null);
      const res = await fetch(`/api/gazette${w ? `?week=${w}` : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
    } catch {
      setErr("Could not load the Gazette.");
    }
  }, []);

  useEffect(() => {
    const request = window.setTimeout(() => void load(week), 0);
    return () => window.clearTimeout(request);
  }, [load, week]);

  if (err) {
    return <p className="py-16 text-center text-sm text-white/50">{err}</p>;
  }
  if (!data) {
    return (
      <p className="py-16 text-center text-sm text-white/40">
        Setting the type…
      </p>
    );
  }
  if (!data.connected || !data.gazette) {
    return (
      <p className="py-16 text-center text-sm text-white/50">
        No league connected yet.
      </p>
    );
  }

  const g = data.gazette;
  plainNames.clear();
  for (const n of g.plainNames ?? []) plainNames.add(n);
  // Advance the joke rotation to this issue BEFORE any copy is built, so every
  // pick() below lands on a different line than last week's edition.
  ISSUE_SHIFT = g.week;
  const a = g.awards;
  const top = g.scores[0];
  const bottom = g.scores[g.scores.length - 1];
  const freshRoast = g.freshContests[0] ?? null;
  const benchGem = a.benchGem;
  // Closest escape: the team just above the chop line, and by how much.
  const secondLast = g.scores.length >= 2 ? g.scores[g.scores.length - 2] : null;
  const escapeMargin = secondLast && bottom ? secondLast.points - bottom.points : null;
  // Biggest beatdown: gap between the top score and the basement.
  const beatdownGap = top && bottom ? top.points - bottom.points : null;

  // The Funny Pages: a 4-panel bit ABOUT THE BIDS - the waiver auction is the
  // funniest thing in the league, so the comic lives there. The trick is to land
  // a FRESH joke, not restate the headline's numbers: riff on the bidder's
  // psychology, the blown budget, bidding against nobody, the pile of denied bids.
  // One bro plays the delusional bidder, the other has no mercy. Rotates by issue.
  const comic: ComicLine[] = (() => {
    const marq = a.mostAbsurd;
    const spender = a.bigSpender;
    const bits: ComicLine[][] = [];

    if (marq) {
      const t = marq.winner.team;
      const p = marq.player.name;
      // Bit 1: the psychology of bidding against no one.
      bits.push([
        { who: "a", mood: "talk", text: `How much should I bid on ${p}?` },
        { who: "b", mood: "talk", text: `Nobody else wants him. Bid a dollar.` },
        { who: "a", mood: "smug", text: `Or... hear me out... my entire budget.` },
        { who: "b", mood: "react", text: `And that's how ${t} was born.` },
      ]);
      // Bit 2: the cope after winning an uncontested war.
      bits.push([
        { who: "a", mood: "smug", text: `I won the bid on ${p}!` },
        { who: "b", mood: "talk", text: `You were the only bidder.` },
        { who: "a", mood: "yell", text: `A win is a win!` },
        { who: "b", mood: "react", text: `You beat yourself. Twice, somehow.` },
      ]);
    }
    if (spender) {
      const t = spender.team;
      bits.push([
        { who: "a", mood: "smug", text: `${t} led the league in FAAB spending!` },
        { who: "b", mood: "talk", text: `That's not a flex, that's a receipt.` },
        { who: "a", mood: "talk", text: `You gotta spend money to make money.` },
        { who: "b", mood: "react", text: `You made 6 points. That's the return.` },
      ]);
    }
    if (g.totals.bidsLost > 0) {
      bits.push([
        { who: "a", mood: "yell", text: `${g.totals.bidsLost} bids got denied this week!` },
        { who: "b", mood: "talk", text: `So the wire's just heartbreak now.` },
        { who: "a", mood: "talk", text: `Somebody's refreshing at 3 a.m.` },
        { who: "b", mood: "smug", text: `And still losing to a guy who forgot to bid.` },
      ]);
    }
    // Fallback: generic auction chaos, still about bids.
    bits.push([
      { who: "a", mood: "talk", text: `I'm being disciplined with FAAB.` },
      { who: "b", mood: "smug", text: `Then you saw an RB2.` },
      { who: "a", mood: "yell", text: `HE HAS UPSIDE!` },
      { who: "b", mood: "react", text: `Budget: deceased.` },
    ]);
    return pick(bits, g.week);
  })();

  // Lead with the week's loudest overpay - biggest raw blowout or wildest
  // multiple, whichever the league will actually talk about (see leadCopy).
  const abs = a.mostAbsurd;
  const lead = abs
    ? leadCopy(abs)
    : a.benched
      ? {
          kicker: "Held for questioning",
          head: `Paid ${money(a.benched.bid)}, then benched him`,
          sub: `${a.benched.team} spent ${money(a.benched.bid)} on ${a.benched.player.name} and left him on the bench, where he quietly scored ${pts(a.benched.points)}. The lineup was set by someone, allegedly.`,
        }
      : a.flop
        ? {
            kicker: "Money incinerated",
            head: `${money(a.flop.bid)} spent · ${pts(a.flop.points)} points returned`,
            sub: `${a.flop.team} bought ${a.flop.player.name} for ${money(a.flop.bid)} and got ${pts(a.flop.points)} back - ${money(Math.round(a.flop.bid / Math.max(0.1, a.flop.points ?? 0.1)))} a point. The receipt has been laminated for the group chat.`,
          }
        : {
            kicker: `Week ${g.week}`,
            head: "A suspiciously competent week",
            sub: "No wild overpays, no benched stars, no crimes to prosecute. Cowardly, frankly - the Roast Desk expects better.",
          };

  const weeks = Array.from({ length: data.lastCompleted }, (_, i) => i + 1).reverse();

  // The Thursday kickoff banner: only on the latest edition, since it's about the
  // week about to start. Announces the upcoming week + TNF, nudges lineups (witty),
  // and uses last week's biggest start/sit miss as the cautionary tale - without
  // scolding, just trolling. `data.currentWeek` is the live NFL week (upcoming).
  const isLatest = g.week === data.lastCompleted;
  const nextWeek = data.currentWeek;
  const tnf = data.tnf;
  // When TNF actually is, relative to the reader's own clock: "tonight" printed
  // on a Wednesday is wrong.
  const when = (() => {
    if (!tnf) return { lc: "on Thursday", uc: "THURSDAY" };
    // Count calendar days in US Eastern time, where the NFL keeps its clock: an
    // 8:15pm ET Thursday kickoff is already Friday in UTC and further east.
    const k = new Date(tnf.kickoff);
    const etDay = (d: Date) =>
      Date.parse(d.toLocaleDateString("en-CA", { timeZone: "America/New_York" }));
    const days = Math.round((etDay(k) - etDay(new Date())) / 86_400_000);
    if (days <= 0) return { lc: "tonight", uc: "TONIGHT" };
    if (days === 1) return { lc: "tomorrow night", uc: "TOMORROW NIGHT" };
    const wd = k.toLocaleDateString("en-US", { weekday: "long", timeZone: "America/New_York" });
    return { lc: `${wd} night`, uc: `${wd.toUpperCase()} NIGHT` };
  })();
  const kickoff = (() => {
    // Name the actual TNF matchup when we have it, so the nudge is specific.
    const game = tnf ? `${tnf.away} at ${tnf.home}` : null;
    const nudge = game
      ? pick(
          [
            `${game} (${tnf!.short}) kicks off Week ${nextWeek} ${when.lc}. Fix your lineups before kickoff or become next week's headline.`,
            `Week ${nextWeek} opens ${when.uc} with ${game}. Set your lineups. The Roast Desk is watching.`,
            `${tnf!.short} ${when.lc}, then the wire closes for Week ${nextWeek}. Fix your lineups now, cope later.`,
            `TNF is ${game}. Get your starters set before it kicks or forever hold your excuses.`,
          ],
          nextWeek,
        )
      : pick(
          [
            `Thursday Night Football kicks off Week ${nextWeek} ${when.lc}. Fix your lineups before then or become next week's headline.`,
            `Week ${nextWeek} starts ${when.uc} on TNF. Set your lineups. The Roast Desk is watching.`,
            `The wire's closed, the games are here. Fix your lineups before TNF or forever hold your excuses.`,
          ],
          nextWeek,
        );
    // Cautionary tale from last week's start/sit crime, no finger-wagging.
    const miss = benchGem
      ? pick(
          [
            `Cautionary tale: last week ${benchGem.team} left ${benchGem.player.name} (${pts(benchGem.points)}) on the pine. Could be you ${when.lc}. Won't be, right? ...Right?`,
            `Remember: ${benchGem.team} benched ${pts(benchGem.points)} points last week. TNF starts soon. Don't pull a ${benchGem.team}.`,
            `Last week ${benchGem.team} started the wrong guy and ate ${benchGem.player.name}'s ${pts(benchGem.points)} from the bench. History is free to repeat. Check your lineup.`,
          ],
          benchGem.team.length + nextWeek,
        )
      : `Somebody always forgets a starter. Statistically, it's about to be one of you. Don't.`;
    return { nudge, miss };
  })();

  return (
    <div className="mx-auto max-w-3xl px-3 pb-16">
      {/* week picker - the archive is half the fun */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5">
        {weeks.map((w) => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className={`font-display rounded px-2.5 py-1 text-[11px] uppercase tracking-[0.15em] transition ${
              g.week === w
                ? "bg-[#ef4444] text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            Wk {w}
          </button>
        ))}
      </div>

      {/* the sheet */}
      <div
        className="mx-auto overflow-hidden rounded-sm px-5 py-4 text-[#14110d] shadow-2xl sm:px-7 sm:py-6"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.014) 0 2px, transparent 2px 4px), #efe9da",
        }}
      >
        <div className="border-t-2 border-[#14110d]" />
        <div className="flex justify-between py-1 text-[9px] uppercase tracking-[0.18em]">
          <span>Week {g.week} Dispatch</span>
          <span className="hidden sm:inline">The League&apos;s Paper of Record</span>
          <span>Price: One Waiver Claim</span>
        </div>
        {/* The bids were placed during the previous week's waiver run; the
            players they bought played THIS week. Saying so up front, because
            "Week 2" next to a bid placed in week 1 reads as an error. */}
        <p className="pb-1 text-center text-[9px] italic text-[#14110d]/60">
          Verdict: Week {Math.max(1, g.week - 1)} claims, scored in Week {g.week} · Just in: Week {g.week} claims, not yet played
        </p>
        <div className="border-t border-[#14110d]" />

        <h1 className="py-2 text-center font-serif text-[34px] font-black leading-none tracking-tight sm:text-[52px]">
          <span className="mr-1 align-[-2px] text-[26px] sm:text-[38px]">🪓</span>
          The Guillotine Roast
        </h1>
        <div className="border-t-2 border-[#14110d]" />

        {/* Kickoff bulletin - a newspaper notice in the paper's own ink (black on
            cream, dark-red label), so it reads as part of the page rather than a
            web banner. Only on the latest edition; it's about the week now starting. */}
        {isLatest && (
          <section className="my-3 border-y-2 border-[#14110d] py-2.5 text-center">
            <p className="font-display text-[9px] uppercase tracking-[0.25em] text-[#8c1c13]">
              Kickoff Bulletin · Week {nextWeek} starts {when.lc === "tonight" ? "today" : when.lc.replace(" night", "")}
            </p>
            <p className="mx-auto mt-1.5 max-w-xl text-[13px] font-semibold leading-snug">
              {kickoff.nudge}
            </p>
            <p className="mx-auto mt-1 max-w-xl text-[11px] italic leading-snug text-[#14110d]/60">
              {kickoff.miss}
            </p>
          </section>
        )}

        <section className="px-1 pb-2 pt-4 text-center">
          <p className="font-display text-[10px] uppercase tracking-[0.3em] text-[#8c1c13]">
            {lead.kicker}
          </p>
          <h2 className="font-display mt-1.5 text-[26px] font-bold uppercase leading-[0.95] tracking-tight sm:text-[38px]">
            {lead.head}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-[13px] leading-snug sm:text-sm">
            {lead.sub}
          </p>
        </section>

        {/* numbers strip */}
        <div className="my-3 grid grid-cols-3 border-2 border-[#14110d] sm:grid-cols-5">
          {[
            [money(g.totals.spend), "FAAB paid"],
            [String(g.totals.bidsPlaced), "Bids placed"],
            [String(g.totals.bidsLost), "Bids denied"],
            [money(g.totals.freshSpend), "Fresh money"],
            [top ? pts(top.points) : "-", "Top score"],
          ].map(([n, k], i) => (
            <div
              key={k}
              className={`border-[#14110d] px-1 py-2 text-center ${i < 4 ? "border-r" : ""} ${i < 2 ? "border-b sm:border-b-0" : ""}`}
            >
              <div className="font-display text-xl font-bold leading-none">{n}</div>
              <div className="mt-1 text-[8px] uppercase tracking-[0.12em]">{k}</div>
            </div>
          ))}
        </div>

        {g.newsHook && (
          <div className="my-3 border-l-4 border-[#8c1c13] bg-[#8c1c13]/[0.06] px-3 py-2">
            <p className="font-display text-[9px] uppercase tracking-[0.25em] text-[#8c1c13]">
              Off the wire · {g.newsHook.source}
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-snug">
              {wireRoast(g.newsHook)}
            </p>
            <p className="mt-1 text-[10px] italic text-[#14110d]/55">
              Real headline: &ldquo;{g.newsHook.headline}&rdquo;
            </p>
          </div>
        )}

        <section className="my-4 border-y-2 border-[#14110d] py-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-[9px] uppercase tracking-[0.25em] text-[#8c1c13]">
                The Roast Desk
              </p>
              <h3 className="font-serif text-2xl font-black leading-none">
                Receipts, regrets &amp; roster crimes
              </h3>
            </div>
            <span className="hidden text-right font-display text-[8px] uppercase tracking-[0.14em] sm:block">
              No manager is safe
            </span>
          </div>
          <div className="mt-3 grid gap-x-5 gap-y-3 text-[13px] leading-snug sm:grid-cols-2">
            {benchGem && <p><b>Started the wrong guy:</b> {roastBenchGem(benchGem)}</p>}
            {a.benched && <p><b>Clipboard criminal:</b> {roastBench(a.benched)}</p>}
            {a.flop && <p><b>Financial misconduct:</b> {roastFlop(a.flop)}</p>}
            {freshRoast && <p><b>Fresh from the panic room:</b> {roastContest(freshRoast)}</p>}
            {top && <p><b>Victory-lap department:</b> {roastScore(top.team, top.points, "first")}</p>}
            {bottom && <p><b>Basement watch:</b> {roastScore(bottom.team, bottom.points, "last")}</p>}
            {beatdownGap != null && beatdownGap > 0 && top && bottom && (
              <p><b>The spread:</b> {roastBeatdown(top.team, bottom.team, beatdownGap)}</p>
            )}
            {escapeMargin != null && escapeMargin >= 0 && secondLast && (
              <p><b>Closest escape:</b> {roastEscape(secondLast.team, escapeMargin)}</p>
            )}
            {g.chopped && (
              <p><b>Final notice:</b> {g.chopped.team} scored {pts(g.chopped.points)}, got chopped, and is now available for unsolicited lineup advice.</p>
            )}
            {g.spending?.topSpender && g.spending.topSpender.used > 0 && (
              <p><b>Biggest wallet:</b> {g.spending.topSpender.team} has torched {money(g.spending.topSpender.used)} in FAAB this season and is somehow still not running the league. Spending like the budget expires at midnight. {teamPun(g.spending.topSpender.team)}</p>
            )}
            {g.spending?.cheapest && (
              <p><b>Tightest wallet:</b> {g.spending.cheapest.team} has spent {money(g.spending.cheapest.used)} in FAAB all year. {g.spending.cheapest.used === 0 ? "Zero. Nada. Surviving on vibes and other people's funerals." : "Coupon-clipping their way through a survival pool."} {teamPun(g.spending.cheapest.team)}</p>
            )}
          </div>
        </section>

        {/* The Value Desk - the ONE smart buy and the ONE cheapskate. Deliberately
            does NOT re-roast the flop/benched/benchGem crimes already covered in the
            Roast Desk above; this beat is about the market, not the same receipts. */}
        {(a.steal || a.lowball) && (
          <>
            <h4 className="font-display mt-4 border-b-2 border-[#14110d] pb-1 text-[10px] uppercase tracking-[0.22em]">
              The Value Desk · one genius, one cheapskate
            </h4>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              {a.steal && (
                <Card
                  tone="good"
                  tag="Best Buy"
                  team={a.steal.team}
                  jab="Exactly one manager in this league owns a calculator. Here they are."
                >
                  Paid <b>{money(a.steal.bid)}</b> for <b>{a.steal.player.name}</b> and
                  got <b>{pts(a.steal.points)}</b> points out of him. Everyone else
                  spent more and got less.
                </Card>
              )}
              {a.lowball && (
                <Card
                  tone="cheap"
                  tag="Cheapest Offer"
                  team={a.lowball.team}
                  jab="Bidding is a participation sport. You, notably, did not participate."
                >
                  Offered <b>{money(a.lowball.bid)}</b> for{" "}
                  <b>{a.lowball.player.name}</b> and lost. It cost nothing, which is
                  roughly what it was worth.
                </Card>
              )}
            </div>
          </>
        )}

        {/* bidding war */}
        <h4 className="font-display mt-4 border-b-2 border-[#14110d] pb-1 text-[10px] uppercase tracking-[0.22em]">
          The Bidding War · Week {Math.max(1, g.week - 1)} claims, Week {g.week} points
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#14110d] text-left font-display text-[8px] uppercase tracking-[0.12em]">
                <th className="py-1 pr-2">Player</th>
                <th className="py-1 pr-2">Winner</th>
                <th className="py-1 pr-2 text-right">Paid</th>
                <th className="py-1 pr-2">Next highest</th>
                <th className="py-1 pr-2 text-right">Bid (unpaid)</th>
                <th className="py-1 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {g.contests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-center italic">
                    No contested claims. A peaceful, cowardly week.
                  </td>
                </tr>
              ) : (
                g.contests.map((c: GazetteContest) => (
                  <tr key={c.winner.playerId} className="border-b border-dotted border-[#14110d]/30">
                    <td className="py-1 pr-2 font-bold">{c.player.name}</td>
                    <td className="py-1 pr-2">{c.winner.team}</td>
                    <td className="font-display py-1 pr-2 text-right font-bold text-[#8c1c13] tabular-nums">
                      {money(c.winner.bid)}
                    </td>
                    <td className="py-1 pr-2 text-[#14110d]/60">{c.runnerUp?.team ?? "-"}</td>
                    <td className="font-display py-1 pr-2 text-right tabular-nums text-[#14110d]/60">
                      {c.runnerUp ? money(c.runnerUp.bid) : "-"}
                    </td>
                    <td className="font-display py-1 text-right tabular-nums">{pts(c.points)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* This week's run has already cleared. Those players have not played
            yet, so there are no points to judge - but an overpay is funny the
            moment it lands, and waiting a week to mention it wastes the joke. */}
        {g.freshContests.length > 0 && (
          <>
            <h4 className="font-display mt-4 border-b-2 border-[#14110d] pb-1 text-[10px] uppercase tracking-[0.22em]">
              Just In · Week {g.week} claims, verdict pending
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#14110d] text-left font-display text-[8px] uppercase tracking-[0.12em]">
                    <th className="py-1 pr-2">Player</th>
                    <th className="py-1 pr-2">Bought by</th>
                    <th className="py-1 pr-2 text-right">Paid</th>
                    <th className="py-1 pr-2">Next highest</th>
                    <th className="py-1 pr-2 text-right">Bid (unpaid)</th>
                    <th className="py-1 text-right">Over</th>
                  </tr>
                </thead>
                <tbody>
                  {g.freshContests.map((c: GazetteContest) => {
                    const mult = c.winner.bid / Math.max(1, c.runnerUp?.bid ?? 1);
                    return (
                      <tr
                        key={c.winner.playerId}
                        className="border-b border-dotted border-[#14110d]/30"
                      >
                        <td className="py-1 pr-2 font-bold">{c.player.name}</td>
                        <td className="py-1 pr-2">{c.winner.team}</td>
                        <td className="font-display py-1 pr-2 text-right font-bold text-[#8c1c13] tabular-nums">
                          {money(c.winner.bid)}
                        </td>
                        <td className="py-1 pr-2 text-[#14110d]/60">
                          {c.runnerUp?.team ?? "-"}
                        </td>
                        <td className="font-display py-1 pr-2 text-right tabular-nums text-[#14110d]/60">
                          {c.runnerUp ? money(c.runnerUp.bid) : "-"}
                        </td>
                        <td
                          className={`font-display py-1 text-right tabular-nums ${mult >= 3 ? "font-bold text-[#8c1c13]" : "text-[#14110d]/60"}`}
                        >
                          {mult >= 2 ? `${Math.round(mult)}x` : `+${money(c.gap)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-[10px] italic text-[#14110d]/55">
              These players have not played yet. Next week we find out who was
              right.
            </p>
          </>
        )}

        {/* The Scoreboard - full width */}
        <div className="mt-4">
          <h4 className="font-display border-b-2 border-[#14110d] pb-1 text-[10px] uppercase tracking-[0.22em]">
            The Scoreboard
          </h4>
          <ul className="mt-1 columns-2 gap-6 text-[12px]">
            {g.scores.map((s, i) => (
              <li
                key={s.rosterId}
                className="flex justify-between border-b border-dotted border-[#14110d]/25 py-[2px]"
              >
                <span className="truncate pr-2">
                  <span className="mr-1.5 tabular-nums text-[#14110d]/40">{i + 1}</span>
                  {s.team}
                </span>
                <span
                  className={`font-display tabular-nums ${
                    i === 0
                      ? "font-bold text-[#1d5c33]"
                      : i === g.scores.length - 1
                        ? "font-bold text-[#8c1c13]"
                        : ""
                  }`}
                >
                  {pts(s.points)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Obituaries - the SAME framed "In Loving Memory" clipping the Guillotine
            page uses, so the memorial reads identically across the site. */}
        <div className="mt-4">
          <h4 className="font-display mb-3 border-b-2 border-[#14110d] pb-1 text-[10px] uppercase tracking-[0.22em]">
            Obituaries
          </h4>
          {g.chopped ? (
            <ObituaryNotice
              name={g.chopped.team}
              points={g.chopped.points ?? 0}
              week={g.week}
              avatar={g.chopped.avatar}
            />
          ) : (
            <p className="text-center text-[12px] italic text-[#14110d]/70">
              Everyone survived Week {g.week}. The blade is unionized and took the day
              off.
            </p>
          )}
        </div>

        <ComicStrip lines={comic} />

        <p className="mt-4 text-center text-[8px] uppercase tracking-[0.12em] text-[#14110d]/55">
          The numbers are Sleeper&apos;s. The disrespect is ours.
        </p>
      </div>
    </div>
  );
}
