// The fixed pool of 28 managers for the 2026 GreenLite Survivor Fantasy season.
// People are NOT pre-assigned to a league - everyone spins in (capped at 14 per league).

export type LeagueId = "navy" | "marine";

export type League = {
  id: LeagueId;
  name: string;
  short: string;
  emoji: string;
  motto: string; // service motto for the crest
  teams: number; // real Sleeper league size (used by the season scrubber)
  // Tailwind-friendly color tokens used across the UI.
  accent: string; // hex, used for the wheel + charts
  gradient: string; // tailwind gradient classes for cards/boards
  ring: string; // tailwind ring color
};

// Naval gold, shared across the Navy/Marine crest styling.
export const CREST_GOLD = "#e3b341";

export const CAP_PER_LEAGUE = 14;

export const MAX_MESSAGE_LEN = 500;

// The Guillotine rules, written in ASD-STE100 Simplified Technical English.
export const GAME_RULES: { title: string; body: string }[] = [
  {
    title: "Weekly points decide the table",
    body: "The standings are your points for the current week only. A win in a single week gives no advantage, and last week's score does not carry over. Every week starts level.",
  },
  {
    title: "The chop starts in Week 1",
    body: "One team is eliminated every week from Week 1 - the team with the lowest score that week.",
  },
  {
    title: "Elimination is permanent",
    body: "There is no consolation bracket and no buy-back. When you are chopped, your season is over.",
  },
  {
    title: "One bad week ends your season",
    body: "There is no running total to protect you. If you put up the lowest score in any week, you are chopped in that week.",
  },
  {
    title: "Set your lineup each week",
    body: "An empty or careless lineup scores low and lowers your total. Check the bye weeks and the injury report before each week.",
  },
  {
    title: "Chopped teams release their players",
    body: "When a team is eliminated, its roster goes to the waiver wire. The pool of available players gets better each week.",
  },
  {
    title: "Waivers use a FAAB budget",
    body: "Add players with free-agent auction bidding (FAAB). Each team gets a $1000 season budget that does not refill. Spend it with care.",
  },
  {
    title: "Last team standing wins",
    body: "The chop continues every week until only one team is left. That final survivor wins the league - there is no separate championship round.",
  },
  {
    title: "Buy-in is $100",
    body: "Each team pays $100 to enter. The prize split is decided per league and posted later.",
  },
];

// Internal ids double as DB/config keys. Two new Sleeper leagues named Navy and
// Marine Corps get created once everyone's spun in (14 a side).
export const LEAGUES: Record<LeagueId, League> = {
  navy: {
    id: "navy",
    name: "League Navy",
    short: "Navy",
    emoji: "⚓",
    motto: "Anchors Aweigh",
    teams: 14,
    accent: "#3b82f6",
    gradient: "from-blue-600/20 to-blue-900/10",
    ring: "ring-blue-500/40",
  },
  marine: {
    id: "marine",
    name: "League Marine Corps",
    short: "Marine Corps",
    emoji: "🦅",
    motto: "Semper Fi",
    teams: 14,
    accent: "#ef4444",
    gradient: "from-red-600/20 to-amber-900/10",
    ring: "ring-red-500/40",
  },
};

export const LEAGUE_LIST: League[] = [LEAGUES.navy, LEAGUES.marine];

// All 28 managers, in one shuffled-in pool. Order here is just alphabetical for
// the picker; league assignment is decided live by the spin.
export const MANAGERS: string[] = [
  "Alex Maruniak",
  "Art Griffin",
  "Ava Seccuro",
  "Ben Allen",
  "Carly Adams",
  "Dawit Beshah",
  "Eli Felber",
  "Erin Crouse",
  "Jack McCarthy",
  "Jackson Shuey",
  "Jalijah Daniels",
  "James Gallagher",
  "Kaelan Monroe",
  "Kevin Locke",
  "Kevin Nally",
  "Kevin Rogovich",
  "Kyle Reckert",
  "Maddy Nguyen",
  "Matthew Mongelli",
  "Michael Chang",
  "Nick Knise",
  "Paul Brodersen",
  "Peter Teachen",
  "Riley O'Keefe",
  "Sam Dobens",
  "Samantha Hatz",
  "Sara Brumm",
  "Sergio Flores",
];

export const TOTAL_MANAGERS = MANAGERS.length; // 28
