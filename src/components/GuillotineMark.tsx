// A guillotine graphic for The Guillotine banner - two posts, a top beam, and
// an angled blade with a blood-red edge. Purely decorative.
export default function GuillotineMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* frame posts + base */}
      <g stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.9">
        <path d="M26 14 V106" />
        <path d="M94 14 V106" />
        <path d="M16 106 H104" />
        {/* top beam */}
        <path d="M20 16 H100" strokeWidth="7" />
        {/* lunette (neck hole) */}
        <path d="M52 100 h16" strokeWidth="4" />
      </g>
      {/* the blade - angled, sitting just below the beam */}
      <g>
        <path
          d="M30 24 H90 L74 52 H30 Z"
          fill="#c8ccd2"
        />
        {/* bevel highlight */}
        <path d="M30 24 H90 L86 31 H30 Z" fill="#eef1f4" opacity="0.7" />
        {/* the cutting edge - blood red */}
        <path d="M30 52 H74 L71 57 H30 Z" fill="#ef4444" />
      </g>
      {/* a drip */}
      <circle cx="42" cy="66" r="2.4" fill="#ef4444" opacity="0.85" />
    </svg>
  );
}
