// Subtle, elegant graveyard backdrop for The Guillotine - a low, muted scene
// rather than a busy illustration. Purely presentational.
export default function Cemetery() {
  const stone = "rgba(255,255,255,0.035)";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* deep base with a faint red cast from above */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 42rem at 50% -18%, rgba(239,68,68,0.10), transparent 58%), #080d0b",
        }}
      />
      {/* moon - flat glowing disc with craters and a soft halo */}
      <div
        className="absolute right-[10%] top-10 h-14 w-14 rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 48%, #f5f7ee 0%, #e6ead9 68%, #d3d8c6 100%)",
          boxShadow:
            "0 0 55px 20px rgba(240,244,225,0.22), 0 0 110px 48px rgba(240,244,225,0.08)",
        }}
      >
        {[
          ["28%", "30%", "15%", 0.34],
          ["60%", "50%", "20%", 0.26],
          ["40%", "70%", "10%", 0.3],
          ["70%", "24%", "8%", 0.24],
        ].map(([left, top, size, o], i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: left as string,
              top: top as string,
              width: size as string,
              height: size as string,
              background: `rgba(120,128,108,${o})`,
            }}
          />
        ))}
      </div>
      {/* graveyard silhouettes: mounds, headstones, crosses, a bare tree */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMax slice"
        fill={stone}
      >
        {/* bare tree, left */}
        <g stroke={stone} strokeWidth="7" strokeLinecap="round" fill="none">
          <path d="M80 240 V120" strokeWidth="11" />
          <path d="M80 160 l-32 -30 M80 175 l30 -26 M80 138 l-24 -36 M80 145 l28 -42 M80 122 l-12 -30 M80 122 l14 -26" />
        </g>
        <path d="M0 240 V182 Q200 158 420 176 T820 172 T1200 180 V240 Z" />
        <path d="M150 240 V152 a26 26 0 0 1 52 0 V240 Z" />
        {/* cross */}
        <rect x="330" y="128" width="14" height="112" rx="4" />
        <rect x="312" y="150" width="50" height="13" rx="4" />
        <path d="M470 240 V160 a22 22 0 0 1 44 0 V240 Z" />
        <path d="M690 240 V144 a24 24 0 0 1 48 0 V240 Z" />
        {/* small cross */}
        <rect x="880" y="168" width="11" height="72" rx="3" />
        <rect x="866" y="184" width="39" height="10" rx="3" />
        <path d="M1010 240 V158 a24 24 0 0 1 48 0 V240 Z" />
      </svg>
      {/* drifting fog */}
      <div className="cemetery-fog absolute bottom-0 left-0 h-28 w-[200%]" />
      {/* bottom vignette for depth */}
      <div
        className="absolute inset-0"
        style={{ boxShadow: "inset 0 -70px 100px rgba(0,0,0,0.65)" }}
      />
    </div>
  );
}
