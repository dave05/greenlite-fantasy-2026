// Country-club backdrop: a bright daytime golf course - blue sky, sun, rolling
// green fairway, and a flag pin on the green. Decoration, not noise.
export default function Fairway() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* daytime sky */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(96,165,250,0.16) 0%, rgba(52,209,122,0.08) 42%, transparent 70%), #0b2018",
        }}
      />
      {/* bright sun */}
      <div
        className="absolute right-[14%] top-10 h-14 w-14 rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 50%, #fff7dd, #ffe9a6)",
          opacity: 0.7,
          boxShadow: "0 0 60px 20px rgba(255,240,190,0.18)",
        }}
      />
      {/* a couple of soft clouds */}
      <div
        className="absolute left-[18%] top-16 h-6 w-28 rounded-full blur-xl"
        style={{ background: "rgba(255,255,255,0.10)" }}
      />
      <div
        className="absolute right-[34%] top-24 h-5 w-20 rounded-full blur-xl"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />
      {/* rolling fairway hills */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1200 220"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        <path d="M0 220 V150 Q300 96 620 138 T1200 128 V220 Z" fill="rgba(52,209,122,0.10)" />
        <path d="M0 220 V178 Q260 136 640 172 T1200 168 V220 Z" fill="rgba(52,209,122,0.16)" />
        {/* flag pin on the green */}
        <g>
          <line x1="920" y1="168" x2="920" y2="76" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinecap="round" />
          <path d="M920 76 L968 90 L920 104 Z" fill="rgba(239,68,68,0.7)" />
          <ellipse cx="920" cy="170" rx="28" ry="5" fill="rgba(52,209,122,0.22)" />
        </g>
        {/* sand bunker */}
        <ellipse cx="360" cy="196" rx="60" ry="9" fill="rgba(244,236,210,0.14)" />
      </svg>
      {/* gentle bottom shading */}
      <div
        className="absolute inset-0"
        style={{ boxShadow: "inset 0 -50px 80px rgba(0,0,0,0.4)" }}
      />
    </div>
  );
}
