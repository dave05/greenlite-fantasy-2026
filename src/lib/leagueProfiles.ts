// League member dossiers, baked INTO the app so the live site itself "remembers"
// each manager's fandom, identity, and running-joke material - no dependency on
// any external note or scheduled job. The Gazette roast copy reads from here.
//
// House rules (same as the app's): good-natured ribbing about SPORTS FANDOM and
// FANTASY DECISIONS only. Never anything genuinely personal or sensitive. Punch
// at allegiances and roster crimes, not people's real lives. No em dashes.
//
// `match` is a lowercase substring tested against the Sleeper team/display name.
// `jabs` are evergreen-ish zingers; the Wednesday routine refreshes topical ones.

export type LeagueProfile = {
  match: string;
  person: string;
  fandom?: string;
  jabs: string[];
};

export const LEAGUE_PROFILES: LeagueProfile[] = [
  {
    match: "sdobens",
    person: "Sam",
    fandom: "Patriots",
    jabs: [
      "Patriots fan Sam still swears Drake Maye is elite. They call him 'the Schedule' for a reason, Sam.",
      "Sam's whole personality is a QB who feasted on an easy schedule and now throws picks like confetti.",
      "Undefeated at overrating New England since birth.",
    ],
  },
  {
    match: "krogo",
    person: "Kevin (Rogo)",
    fandom: "Vikings",
    jabs: [
      "Rogo's Vikings are 3-0 and his fantasy team is in hospice. Enjoy the one that counts, Kevin.",
      "3-0 in real life, chopped in fantasy. Skol, I guess.",
      "Rogo rosters an entire injury report and calls it a strategy.",
      "Rumor has it JJ McCarthy wants out of Minnesota too. Even the QB is trying to escape Rogo's fandom.",
    ],
  },
  {
    match: "elifelber",
    person: "Eli",
    fandom: "Giants",
    jabs: [
      "Giants fan Eli drafted the Giants QB and lost them both on the same snap.",
      "Eli would mail Jaxson Dart a spare knee if the Giants let him.",
      "Rooting for the Giants AND rostering them. That is two funerals, one manager.",
    ],
  },
  {
    match: "pumpupthejam",
    person: "Peter",
    fandom: "Eagles",
    jabs: [
      "Eagles fan Peter boos his own roster on reflex.",
      "Peter runs his lineup like a two-minute drill: loud, then absolutely nothing.",
    ],
  },
  {
    match: "kylereckert",
    person: "Kyle",
    fandom: "Vikings",
    jabs: [
      "Another Vikings fan, another lineup built on hope and purple face paint.",
      "Kyle sets his lineup the way the Vikings manage a lead: nervously.",
    ],
  },
  {
    match: "bdaloha",
    person: "Ben",
    fandom: "Saints",
    jabs: [
      "Saints fan Ben paid $299 for Tony Pollard and benched him. Cap hell is a lifestyle.",
      "Ben treats his FAAB like the Saints treat the salary cap: gone, and nobody knows where.",
    ],
  },
  {
    match: "always safe",
    person: "Jalijah",
    jabs: [
      "Jalijah starts injured players and still wins. The team name is a warning label.",
      "Puka Nacua could be in a full body cast and Jalijah would still slot him at WR2.",
      "'Always Safe' is not a name, it is a threat, and the league hates that it is true.",
    ],
  },
  {
    match: "matthewmongelli",
    person: "Matt",
    fandom: "Giants",
    jabs: [
      "Giants fan Matt, praying to a depth chart that does not love him back.",
      "Matt roots for the Giants and drafts like it. Pain is the brand.",
      "Matt has spent $0 in FAAB. Bold to bring a knife to a gunfight and then leave the knife at home.",
    ],
  },
  {
    match: "just survive now",
    person: "Dawit",
    jabs: [
      "The commissioner set the league standard for reckless spending: $182 on Michael Wilson.",
      "JSN paid ~$50 for a Titan, then cut him a week later. Buy high, drop higher, a true visionary.",
      "JSN runs the waiver wire like a revolving door: pay up, panic, release, repeat.",
    ],
  },
  {
    match: "vladimir tuten",
    person: "Vladimir",
    jabs: [
      "Vladimir already torched $721 of his $1,000 FAAB and still isn't leading. Spending like the budget expires tomorrow.",
      "Vlad treats the waiver wire like a going-out-of-business sale he personally must bankrupt.",
    ],
  },
  {
    match: "jackmccarthy",
    person: "Jack",
    jabs: [
      "Jack has spent $0 in FAAB all season and is somehow still alive. Survival by other people's funerals.",
      "Jack didn't earn Week 3, he inherited it. $0 spent, one Rogo sacrificed.",
    ],
  },
];

// The profile whose `match` appears in this team/display name, if any.
export function profileFor(team: string): LeagueProfile | undefined {
  const key = team.toLowerCase();
  return LEAGUE_PROFILES.find((p) => key.includes(p.match));
}
