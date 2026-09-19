// Minimal line icons for the nav - stroke uses currentColor so they inherit the
// tab's text color (and flip on the active state). Consistent 24-grid, 1.75 stroke.
type Name =
  | "home"
  | "guillotine"
  | "countryclub"
  | "rankings"
  | "howto"
  | "guide"
  | "draft"
  | "news"
  | "waiver";

const PATHS: Record<Name, React.ReactNode> = {
  // swap arrows = the waiver wire (add / drop)
  waiver: (
    <>
      <path d="M4 9h13M14 6l3 3-3 3" />
      <path d="M20 15H7M10 12l-3 3 3 3" />
    </>
  ),
  // grid board = the draft board
  draft: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11M15 9v11" />
    </>
  ),
  // newspaper = the newsroom
  news: (
    <>
      <path d="M4 5h13v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5z" />
      <path d="M17 8h3v10a2 2 0 0 1-2 2M7 8h6M7 12h6M7 16h4" />
    </>
  ),
  // open book = how to / beginner guide
  howto: (
    <>
      <path d="M12 6.5C12 5 10.4 4 8 4S4 5 4 6.5V19c2.4-1.3 4-1.3 6.5 0M12 6.5C12 5 13.6 4 16 4s4 1 4 2.5V19c-2.4-1.3-4-1.3-6.5 0M12 6.5V19" />
    </>
  ),
  // bar chart = rankings
  rankings: (
    <>
      <path d="M6 20v-5M12 20V4M18 20v-9" />
    </>
  ),
  // house = home / overview
  home: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
    </>
  ),
  // scissors = the chop
  guillotine: (
    <>
      <circle cx="6" cy="6" r="2.6" />
      <circle cx="6" cy="18" r="2.6" />
      <path d="M20 4 8.5 15.5M14.5 14.5 20 20M8.5 8.5 12 12" />
    </>
  ),
  // golf flag = the country club
  countryclub: (
    <>
      <path d="M7 21V4l11 3.2L7 10.5" />
      <path d="M4.5 21h7" />
    </>
  ),
  // clipboard = the rules
  guide: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2.5" width="6" height="4" rx="1" />
      <path d="M8.5 11h7M8.5 15h4.5" />
    </>
  ),
};

export default function TabIcon({
  name,
  className = "h-4 w-4",
}: {
  name: Name;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
