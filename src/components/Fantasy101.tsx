const STEPS = [
  {
    n: 1,
    icon: "🎯",
    title: "Draft a team",
    body: "Take turns picking real NFL players (QBs, RBs, WRs…) until everyone has a full roster. Your draft runs the week of Aug 31 — pick from your phone.",
  },
  {
    n: 2,
    icon: "📋",
    title: "Set your lineup",
    body: "Each week you choose which of your players start. Benched players score nothing, so check byes and injuries before Sunday.",
  },
  {
    n: 3,
    icon: "🏈",
    title: "Earn points",
    body: "Your starters score fantasy points from what they do in real games — touchdowns, yards, and catches (this is a PPR league: 1 point per catch).",
  },
  {
    n: 4,
    icon: "🏆",
    title: "Win your way",
    body: "Add up your points each week. What counts as “winning” depends on which league you're in — that's the fun part below.",
  },
];

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
              <span className="text-2xl">{s.icon}</span>
              <span className="stat-num text-3xl font-bold text-white/15">0{s.n}</span>
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold uppercase tracking-tight">
              {s.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">{s.body}</p>
          </div>
        ))}
      </div>

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
              No head-to-head. Everyone's total points stack up all season. Each week
              from Week 2, whoever sits at the <span className="text-red-400">bottom of the table</span> is
              eliminated — gone for good. Just don't finish last, and be the last team
              standing.
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
              week — outscore them and you get a win. Win or lose, you stay in. The
              best records make the playoffs, and the playoffs crown the champion.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
