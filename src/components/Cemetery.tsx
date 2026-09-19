// Survivor graveyard backdrop for The Guillotine - atmospheric but readable.
export default function Cemetery() {
  const stone = "rgba(255,255,255,0.06)";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* night base with a red cast bleeding down from the top */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70rem 46rem at 50% -14%, rgba(239,68,68,0.20), transparent 55%), radial-gradient(50rem 40rem at 90% 20%, rgba(239,68,68,0.08), transparent 60%), #0a0f0c",
        }}
      />
      {/* moon */}
      <div
        className="absolute right-[11%] top-9 h-16 w-16 rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 48%, #f5f7ee 0%, #e6ead9 66%, #d3d8c6 100%)",
          boxShadow: "0 0 60px 22px rgba(240,244,225,0.20), 0 0 120px 52px rgba(240,244,225,0.08)",
        }}
      >
        {[
          ["28%", "30%", "15%", 0.32],
          ["60%", "50%", "20%", 0.24],
          ["40%", "70%", "10%", 0.28],
        ].map(([left, top, size, o], i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{ left: left as string, top: top as string, width: size as string, height: size as string, background: `rgba(120,128,108,${o})` }}
          />
        ))}
      </div>

      {/* faint stars */}
      {[
        ["14%", "16%"],
        ["30%", "30%"],
        ["68%", "12%"],
        ["82%", "38%"],
        ["50%", "22%"],
      ].map(([left, top], i) => (
        <span key={i} className="absolute h-[2px] w-[2px] rounded-full bg-white/40" style={{ left, top }} />
      ))}

      {/* graveyard: bare tree, mounds, headstones, crosses */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1200 300"
        preserveAspectRatio="xMidYMax slice"
        fill={stone}
      >
        <g stroke={stone} strokeWidth="8" strokeLinecap="round" fill="none">
          <path d="M90 300 V150" strokeWidth="13" />
          <path d="M90 195 l-38 -34 M90 210 l34 -30 M90 168 l-28 -42 M90 176 l32 -48 M90 150 l-14 -34 M90 150 l16 -30" />
        </g>
        <path d="M0 300 V232 Q220 202 460 224 T900 220 T1200 230 V300 Z" />
        <path d="M150 300 V196 a30 30 0 0 1 60 0 V300 Z" />
        <g stroke={stone} strokeWidth="0" fill={stone}>
          <rect x="360" y="168" width="16" height="132" rx="4" />
          <rect x="336" y="194" width="64" height="15" rx="4" />
        </g>
        <path d="M520 300 V200 a26 26 0 0 1 52 0 V300 Z" />
        <path d="M760 300 V184 a28 28 0 0 1 56 0 V300 Z" />
        <g fill={stone}>
          <rect x="960" y="210" width="13" height="90" rx="3" />
          <rect x="945" y="228" width="43" height="12" rx="3" />
        </g>
        <path d="M1070 300 V206 a28 28 0 0 1 56 0 V300 Z" />
      </svg>

      {/* drifting fog */}
      <div className="cemetery-fog absolute bottom-0 left-0 h-36 w-[200%]" />
      {/* vignette */}
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 -80px 110px rgba(0,0,0,0.7), inset 0 40px 80px rgba(0,0,0,0.35)" }} />
    </div>
  );
}
