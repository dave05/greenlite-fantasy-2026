// The fixed pool of 28 managers for the 2026 GreenLite Survivor Fantasy season.
// People are NOT pre-assigned to a league — everyone spins in (capped at 14 per league).

export type LeagueId = "navy" | "marine";

export type League = {
  id: LeagueId;
  name: string;
  short: string;
  emoji: string;
  // Tailwind-friendly color tokens used across the UI.
  accent: string; // hex, used for the wheel + charts
  gradient: string; // tailwind gradient classes for cards/boards
  ring: string; // tailwind ring color
};

export const CAP_PER_LEAGUE = 14;

export const MAX_MESSAGE_LEN = 500;

export const LEAGUES: Record<LeagueId, League> = {
  navy: {
    id: "navy",
    name: "League Navy",
    short: "Navy",
    emoji: "⚓",
    accent: "#3b82f6",
    gradient: "from-blue-600/20 to-blue-900/10",
    ring: "ring-blue-500/40",
  },
  marine: {
    id: "marine",
    name: "League Marine Corps",
    short: "Marine Corps",
    emoji: "🦅",
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
