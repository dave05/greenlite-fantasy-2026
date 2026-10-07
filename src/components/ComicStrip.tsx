// The Funny Pages: a black-and-white newspaper comic strip. Two sports-bar bros
// troll the week's fantasy crimes (and each other) across a row of panels. The
// dialogue is generated from the real league data in Gazette; this file just
// draws it. Pure SVG so it stays crisp and self-contained.

export type ComicLine = {
  who: "a" | "b";
  mood: "talk" | "yell" | "smug" | "react";
  text: string;
};

// One cartoon guy. `a` wears a backwards cap, `b` has spiky hair - enough to tell
// them apart panel to panel. Mood drives the eyebrows and mouth so the same two
// faces can set up a joke, land it, and react.
function Guy({ who, mood }: { who: ComicLine["who"]; mood: ComicLine["mood"] }) {
  const ink = "#14110d";
  const brow =
    mood === "yell"
      ? { l: "M40 46 L54 50", r: "M66 50 L80 46" } // angry V
      : mood === "smug"
        ? { l: "M40 49 L54 49", r: "M66 46 L80 49" } // one raised
        : mood === "react"
          ? { l: "M40 45 Q47 41 54 45", r: "M66 45 Q73 41 80 45" } // worried arcs
          : { l: "M40 48 L54 48", r: "M66 48 L80 48" }; // flat
  return (
    <svg viewBox="0 0 120 150" className="h-full w-full" role="img" aria-hidden>
      <g fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* shoulders / jersey */}
        <path d="M18 150 V126 Q18 104 44 100 H76 Q102 104 102 126 V150" fill="#fff" />
        {/* jersey collar + stripe */}
        <path d="M50 100 L60 110 L70 100" />
        <path d="M60 110 V150" />
        {/* neck */}
        <path d="M52 96 V86 M68 96 V86" />
        {/* head */}
        <circle cx="60" cy="60" r="30" fill="#fff" />
        {/* eyes */}
        <circle cx="49" cy="58" r="2.4" fill={ink} stroke="none" />
        <circle cx="71" cy="58" r="2.4" fill={ink} stroke="none" />
        {/* eyebrows (mood) */}
        <path d={brow.l} />
        <path d={brow.r} />
        {/* mouth (mood) */}
        {mood === "yell" ? (
          <ellipse cx="60" cy="74" rx="9" ry="11" fill={ink} stroke="none" />
        ) : mood === "talk" ? (
          <ellipse cx="60" cy="73" rx="6" ry="5" fill={ink} stroke="none" />
        ) : mood === "smug" ? (
          <path d="M49 73 Q60 81 71 72" />
        ) : (
          <path d="M50 76 Q60 70 70 76" />
        )}
        {/* headgear */}
        {who === "a" ? (
          // backwards cap: dome + little snap tab at the back
          <>
            <path d="M31 52 A30 30 0 0 1 89 52 Z" fill={ink} stroke="none" />
            <circle cx="60" cy="38" r="2.5" fill="#fff" stroke="none" />
          </>
        ) : (
          // spiky hair
          <path
            d="M33 44 L38 26 L46 42 L54 22 L62 42 L70 24 L78 42 L86 46"
            fill={ink}
            stroke={ink}
            strokeWidth="2"
          />
        )}
      </g>
    </svg>
  );
}

function Panel({ line, compact }: { line: ComicLine; compact?: boolean }) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden border border-[#14110d] bg-[#fbf8ef] p-2 ${
        compact ? "min-h-[128px]" : "min-h-[150px] sm:min-h-[170px]"
      }`}
    >
      {/* speech bubble */}
      <div className="relative z-10">
        <div className="rounded-2xl border-2 border-[#14110d] bg-white px-2 py-1">
          <p className="text-center text-[10px] font-bold uppercase leading-[1.1] tracking-tight text-[#14110d]">
            {line.text}
          </p>
        </div>
        {/* tail pointing down toward the speaker's side */}
        <div
          className={`h-3 w-3 rotate-45 border-b-2 border-r-2 border-[#14110d] bg-white ${
            line.who === "a" ? "ml-6" : "ml-auto mr-6"
          } -mt-1.5`}
        />
      </div>
      {/* the guy, standing on the panel floor, on his own side */}
      <div className={`mt-auto flex ${line.who === "a" ? "justify-start" : "justify-end"}`}>
        <div className={compact ? "h-14 w-12" : "h-20 w-16 sm:h-24 sm:w-20"}>
          <Guy who={line.who} mood={line.mood} />
        </div>
      </div>
    </div>
  );
}

export default function ComicStrip({
  lines,
  layout = "row",
}: {
  lines: ComicLine[];
  // "row" = 4 panels across (full width); "grid" = 2x2 (fits beside a column).
  layout?: "row" | "grid";
}) {
  if (!lines.length) return null;
  return (
    <section className={layout === "row" ? "mt-6" : ""}>
      <h4 className="font-display border-b-2 border-[#14110d] pb-1 text-[10px] uppercase tracking-[0.22em] text-[#14110d]">
        The Peanut Gallery
      </h4>
      <div className={`mt-2 grid grid-cols-2 ${layout === "row" ? "md:grid-cols-4" : ""}`}>
        {lines.slice(0, 4).map((l, i) => (
          <Panel key={i} line={l} compact={layout === "grid"} />
        ))}
      </div>
    </section>
  );
}
