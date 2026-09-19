// Chalk-style line icons for the Fantasy 101 page - same 24 grid / currentColor
// stroke as the nav icons, so they read as drawn on the board (not system emoji).
type Name =
  | "draft"
  | "lineup"
  | "points"
  | "trophy"
  | "bench"
  | "waiver"
  | "money";

const PATHS: Record<Name, React.ReactNode> = {
  // target = draft your team (take aim, make your picks)
  draft: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
    </>
  ),
  // chalk formation = set your lineup (field with an O and an X)
  lineup: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M12 6v12" />
      <circle cx="7.5" cy="12" r="1.9" />
      <path d="M14.6 10.4l2.9 3.2M17.5 10.4l-2.9 3.2" />
    </>
  ),
  // football = earn points
  points: (
    <g transform="rotate(-35 12 12)">
      <ellipse cx="12" cy="12" rx="9" ry="5" />
      <path d="M8.5 12h7M10.3 10.3v3.4M12 9.8v4.4M13.7 10.3v3.4" />
    </g>
  ),
  // trophy = win your way
  trophy: (
    <>
      <path d="M8 4h8v4.5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5.5H5V7a3 3 0 0 0 3 3M16 5.5h3V7a3 3 0 0 1-3 3" />
      <path d="M12 12.5V16M9 20h6M10 20l.4-4M14 20l-.4-4" />
    </>
  ),
  // bench = the bench (extra players waiting)
  bench: (
    <>
      <rect x="3" y="9" width="18" height="3.4" rx="1" />
      <path d="M5.5 12.4V18M18.5 12.4V18M3 15.6h18" />
    </>
  ),
  // swap arrows = the waiver wire (pick up / drop)
  waiver: (
    <>
      <path d="M4 9h13M14 6l3 3-3 3" />
      <path d="M20 15H7M10 12l-3 3 3 3" />
    </>
  ),
  // dollar = FAAB budget bidding
  money: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 6.5v11" />
      <path d="M14.8 9C14.2 8.1 13.1 7.7 12 7.7c-1.6 0-2.9.8-2.9 2.1 0 2.9 5.8 1.3 5.8 4.2 0 1.4-1.3 2.2-2.9 2.2-1.1 0-2.2-.4-2.8-1.3" />
    </>
  ),
};

export default function FantasyIcon({
  name,
  className = "h-6 w-6",
}: {
  name: Name;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
