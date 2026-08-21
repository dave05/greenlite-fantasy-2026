// A chalk-drawn football - outline + seams + laces. Uses currentColor so the
// chalk-white (or any) color comes from the parent's text color.
export default function Football({ className = "" }: { className?: string }) {
  const laces = [48, 54, 60, 66, 72];
  return (
    <svg
      viewBox="0 0 120 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* ball body */}
      <ellipse
        cx="60"
        cy="37"
        rx="55"
        ry="30"
        stroke="currentColor"
        strokeWidth="3"
        fill="rgba(139, 90, 43, 0.22)"
      />
      {/* pointed-end seams */}
      <path d="M14 27 Q9 37 14 47" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M106 27 Q111 37 106 47" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* center lace line */}
      <line x1="44" y1="37" x2="76" y2="37" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* lace ticks */}
      {laces.map((x) => (
        <line
          key={x}
          x1={x}
          y1="30"
          x2={x}
          y2="44"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
