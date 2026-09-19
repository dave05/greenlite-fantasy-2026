import FantasyIcon from "./FantasyIcon";

const STEPS = [
  {
    n: 1,
    icon: "draft",
    title: "Draft a team",
    body: "Take turns picking real NFL players (QBs, RBs, WRs…) until everyone has a full roster. Your draft runs the week of Aug 31 - pick from your phone.",
  },
  {
    n: 2,
    icon: "lineup",
    title: "Set your lineup",
    body: "Each week you choose which of your players start. Benched players score nothing, so check byes and injuries before Sunday.",
  },
  {
    n: 3,
    icon: "points",
    title: "Earn points",
    body: "Your starters score fantasy points from what they do in real games - touchdowns, yards, and catches (this is a PPR league: 1 point per catch).",
  },
  {
    n: 4,
    icon: "trophy",
    title: "Win your way",
    body: "Add up your points each week. How you actually win depends on your league - survive the weekly chop in the Guillotine, or beat your head-to-head opponent in the Country Club.",
  },
] as const;

// The starting lineup, explained coach-board style. Colors match the Rankings pills.
const POSITIONS = [
  {
    abbr: "QB",
    name: "Quarterback",
    color: "#f59e0b",
    role: "Your playcaller. Throws for yards and touchdowns - usually your biggest scorer each week.",
  },
  {
    abbr: "RB",
    name: "Running Back",
    color: "#34d17a",
    role: "Runs the ball and catches short passes. PPR gives a point per catch, so they rack up points fast.",
  },
  {
    abbr: "WR",
    name: "Wide Receiver",
    color: "#60a5fa",
    role: "Your deep threats. Catch passes downfield for big yards and touchdowns.",
  },
  {
    abbr: "TE",
    name: "Tight End",
    color: "#f472b6",
    role: "Blocker and receiver in one. A steady target, especially near the end zone.",
  },
  {
    abbr: "FLEX",
    name: "Flex spot",
    color: "#eaf6ee",
    role: "A wildcard slot - start an extra RB, WR, or TE. Play whoever's hottest that week.",
  },
  {
    abbr: "K",
    name: "Kicker",
    color: "#a3a3a3",
    role: "Country Club only. Field goals and extra points - unglamorous, but reliable points every week.",
  },
  {
    abbr: "DEF",
    name: "Defense / ST",
    color: "#a3a3a3",
    role: "Country Club only. The whole defensive unit - scores from sacks, turnovers, and return touchdowns.",
  },
];

const COLOR: Record<string, string> = Object.fromEntries(
  POSITIONS.map((p) => [p.abbr, p.color]),
);

// The shared core both leagues start, laid out like a play on the board.
const FORMATION: string[][] = [
  ["QB"],
  ["RB", "RB"],
  ["WR", "TE", "WR"],
  ["FLEX"],
];

function Token({ abbr }: { abbr: string }) {
  const c = COLOR[abbr] ?? "#eaf6ee";
  return (
    <span
      className="font-display flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-xs font-bold tracking-wide"
      style={{ color: c, borderColor: `${c}88`, backgroundColor: `${c}12` }}
    >
      {abbr}
    </span>
  );
}

export default function Fantasy101() {
  return (
    <div className="space-y-10">
      <section className="text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
          Never played? 90-second guide
        </p>
        <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          Fantasy in four steps
        </h2>
      </section>

      {/* 4 steps */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          >
            <div className="flex items-center justify-between">
              <FantasyIcon name={s.icon} className="h-7 w-7 text-[#34d17a]" />
              <span className="stat-num text-3xl font-bold text-white/15">0{s.n}</span>
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold uppercase tracking-tight">
              {s.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">{s.body}</p>
          </div>
        ))}
      </div>

      {/* Coach's board: the lineup */}
      <section>
        <p className="text-center text-[11px] uppercase tracking-[0.3em] text-white/35">
          Coach's board
        </p>
        <h3 className="mt-2 mb-1 text-center font-display text-2xl font-semibold uppercase tracking-tight">
          Your starting lineup
        </h3>
        <p className="mx-auto mb-5 max-w-xl text-center text-sm text-white/50">
          Every week your starters take the field and score. Both leagues share the
          same core - the kicker, defense, and 2nd FLEX are where they split.
        </p>

        <div className="grid gap-4 lg:grid-cols-5">
          {/* The chalk formation panel */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-white/20 bg-[#0a1a13] p-6 lg:col-span-2">
            {/* chalk yard lines */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.5]"
              style={{
                background:
                  "repeating-linear-gradient(180deg, transparent 0 38px, rgba(234,246,238,0.06) 38px 39px)",
              }}
            />
            <div className="relative flex flex-col items-center gap-4">
              <span className="font-display text-[10px] uppercase tracking-[0.25em] text-white/35">
                ▲ End zone
              </span>
              {FORMATION.map((row, i) => (
                <div key={i} className="flex justify-center gap-4">
                  {row.map((abbr, j) => (
                    <Token key={`${abbr}-${j}`} abbr={abbr} />
                  ))}
                </div>
              ))}
              {/* the slots that differ by league */}
              <div className="mt-1 flex flex-col items-center gap-2 border-t border-dashed border-white/15 pt-3">
                <span className="font-display text-[10px] uppercase tracking-[0.2em] text-white/35">
                  then, depending on your league
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-wide text-[#34d17a]">⛳ CC:</span>
                  <Token abbr="K" />
                  <Token abbr="DEF" />
                  <span className="mx-1 text-white/20">or</span>
                  <span className="text-[10px] uppercase tracking-wide text-red-400">🪓 Guill:</span>
                  <Token abbr="FLEX" />
                </div>
              </div>
            </div>
          </div>

          {/* The position key */}
          <div className="grid gap-2 sm:grid-cols-2 lg:col-span-3">
            {POSITIONS.map((p) => (
              <div
                key={p.abbr}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
              >
                <Token abbr={p.abbr} />
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold uppercase tracking-wide">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/55">{p.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Building your roster all season */}
      <section>
        <h3 className="mb-1 text-center font-display text-2xl font-semibold uppercase tracking-tight">
          Keeping your roster stocked
        </h3>
        <p className="mx-auto mb-4 max-w-xl text-center text-sm text-white/50">
          Draft day is just the start. You'll swap players in and out all season.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <FantasyIcon name="bench" className="h-7 w-7 text-white/70" />
            <h4 className="mt-3 font-display text-lg font-semibold uppercase tracking-tight">
              The bench
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">
              Extra players who don't score, but are ready to sub in - injury cover,
              bye-week fill-ins, and stashes you hope break out.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <FantasyIcon name="waiver" className="h-7 w-7 text-white/70" />
            <h4 className="mt-3 font-display text-lg font-semibold uppercase tracking-tight">
              The waiver wire
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">
              The waiver wire is how you pick up players nobody drafted. Grab a hot
              free agent, drop someone from your bench to make room.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <FantasyIcon name="money" className="h-7 w-7 text-white/70" />
            <h4 className="mt-3 font-display text-lg font-semibold uppercase tracking-tight">
              FAAB (Guillotine)
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">
              The Guillotine uses a fake-money budget: bid secretly on the player you
              want, highest bid wins. In the Country Club, the leaguemates decide the
              waiver method.
            </p>
          </div>
        </div>
      </section>

      {/* two ways to win */}
      <section>
        <h3 className="mb-4 text-center font-display text-2xl font-semibold uppercase tracking-tight">
          Two ways to win
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div
            className="rounded-2xl border border-white/10 p-6"
            style={{ borderTop: "3px solid #ef4444", background: "linear-gradient(180deg, rgba(239,68,68,0.06), transparent 60%)" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400/80">
              Survivor
            </p>
            <h4 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight">
              🪓 The Guillotine
            </h4>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              No head-to-head. Every week from Week 1, whoever posts the{" "}
              <span className="text-red-400">lowest score that week</span> is eliminated -
              gone for good. Keep surviving the weekly chop and be the{" "}
              <span className="text-red-400">last team standing</span> to win it all.
            </p>
          </div>
          <div
            className="rounded-2xl border border-white/10 p-6"
            style={{ borderTop: "3px solid #34d17a", background: "linear-gradient(180deg, rgba(52,209,122,0.06), transparent 60%)" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#34d17a]">
              Classic
            </p>
            <h4 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight">
              ⛳ The Country Club
            </h4>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Regular fantasy. You face <span className="text-[#34d17a]">one opponent head-to-head</span> each
              week - outscore them and you get a win. Win or lose, you stay in. The
              best records make the playoffs, and the playoffs crown the champion.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
