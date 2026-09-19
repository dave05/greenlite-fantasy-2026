import { GAME_RULES } from "@/lib/roster";

// Shared core both leagues start (verified from Sleeper). The last slots differ:
// Country Club adds K + DEF; the Guillotine runs a 2nd FLEX instead.
const LINEUP_CORE: { pos: string; count: number; note: string }[] = [
  { pos: "QB", count: 1, note: "Quarterback" },
  { pos: "RB", count: 2, note: "Running backs" },
  { pos: "WR", count: 2, note: "Wide receivers" },
  { pos: "TE", count: 1, note: "Tight end" },
  { pos: "FLEX", count: 1, note: "RB / WR / TE - your pick" },
];

// PPR scoring, the parts that actually move your total.
const SCORING: { label: string; value: string }[] = [
  { label: "Every reception", value: "+1 pt (that's the “PPR”)" },
  { label: "Rushing / receiving yards", value: "1 pt per 10 yards" },
  { label: "Passing yards", value: "1 pt per 25 yards" },
  { label: "Rushing / receiving TD", value: "+6 pts" },
  { label: "Passing TD", value: "+4 pts" },
  { label: "Interception thrown", value: "-1 pt" },
  { label: "Fumble lost", value: "-2 pts" },
];

const HOUSE_RULES: string[] = [
  "Talk all the trash you want. A quiet league is a failed league.",
  "Keep the trash talk about fantasy, not personal. Roast a bad lineup call - like starting a kicker on his bye week - all you want. Someone's actual life is off-limits.",
  "Punch up, not down. Roast whoever knocked you out. Leave the first-timer alone.",
  "Ask anything. Twenty-seven people would love to explain FAAB to you.",
  "Eliminated? Stay and heckle. Watching your killer get killed is half the fun.",
];

export default function LeagueGuide() {
  return (
    <div className="space-y-14">
      {/* Header */}
      <section className="text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">Reference</p>
        <h2 className="mt-3 font-display text-5xl font-medium uppercase tracking-tight">
          The Rules
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60">
          There are two leagues. The Guillotine is the elimination league - the rules
          below apply to it. The Country Club is a standard head-to-head PPR league,
          with weekly matchups and playoffs, and no eliminations.
        </p>
      </section>

      {/* The Guillotine rules */}
      <section>
        <h3 className="chalk font-display mb-4 text-2xl font-semibold uppercase">
          🪓 The Guillotine · rules
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {GAME_RULES.map((r, i) => (
            <div key={i} className="rounded-xl border border-white/12 bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <span className="stat-num flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white/40 text-lg font-bold">
                  {i + 1}
                </span>
                <h4 className="chalk text-sm font-semibold uppercase leading-tight">
                  {r.title}
                </h4>
              </div>
              <p className="mt-2 text-sm text-white/55">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The Country Club */}
      <section>
        <h3 className="chalk font-display mb-4 text-2xl font-semibold uppercase">
          ⛳ The Country Club
        </h3>
        <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-5 text-sm text-white/65">
          <p>
            A standard head-to-head PPR league. You play one opponent each week. Win
            or lose, you stay in. Trades are allowed. The best records make the
            playoffs, and the playoffs decide the champion. Nobody gets chopped.
          </p>
        </div>
      </section>

      {/* Roster & Scoring */}
      <section>
        <h3 className="chalk font-display mb-1 text-2xl font-semibold uppercase">
          Roster &amp; scoring
        </h3>
        <p className="mb-4 text-sm text-white/55">
          Both leagues score the same way - full PPR (points per reception) - and
          share the same core lineup. The last slots are where they differ.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {/* Starting lineup */}
          <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-5">
            <h4 className="chalk mb-3 text-sm font-semibold uppercase tracking-wide">
              Starting lineup
            </h4>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-white/40">
              Both leagues start
            </p>
            <ul className="space-y-2">
              {LINEUP_CORE.map((l) => (
                <li key={l.pos} className="flex items-center gap-3 text-sm">
                  <span className="stat-num flex h-7 w-14 shrink-0 items-center justify-center rounded-md border border-white/15 text-xs font-bold uppercase tracking-wide text-white/80">
                    {l.count}× {l.pos}
                  </span>
                  <span className="text-white/55">{l.note}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2 border-t border-white/10 pt-3 text-xs sm:grid-cols-2">
              <div>
                <p className="font-semibold text-[#34d17a]">⛳ Country Club then adds</p>
                <p className="mt-1 text-white/55">1× K, 1× DEF · 5 on the bench</p>
              </div>
              <div>
                <p className="font-semibold text-red-400">🪓 The Guillotine then adds</p>
                <p className="mt-1 text-white/55">a 2nd FLEX - no K, no DEF · 6 on the bench</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/40">
              Set your lineup before kickoff - a player left on the bench scores
              you nothing.
            </p>
          </div>
          {/* Scoring */}
          <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-5">
            <h4 className="chalk mb-3 text-sm font-semibold uppercase tracking-wide">
              How points are scored
            </h4>
            <ul className="divide-y divide-white/[0.06]">
              {SCORING.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-white/60">{s.label}</span>
                  <span className="stat-num shrink-0 font-semibold text-white/85">
                    {s.value}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-white/40">
              Add up every starter and that's your team's score for the week. In
              the Guillotine those weekly scores stack into a season total.
            </p>
          </div>
        </div>
      </section>

      {/* Money */}
      <section>
        <h3 className="chalk font-display mb-1 text-2xl font-semibold uppercase">
          The money
        </h3>
        <p className="text-sm text-white/55">
          Buy-in is <span className="font-semibold text-white/80">$100 per team</span>.
          The prize split for each league is set by the commissioner.
        </p>
      </section>

      {/* Locker-room rules */}
      <section>
        <h3 className="chalk font-display mb-4 text-2xl font-semibold uppercase">
          Locker-room rules
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {HOUSE_RULES.map((h, i) => (
            <li
              key={i}
              className="rounded-xl border border-white/12 bg-white/[0.02] px-4 py-3 text-sm text-white/70"
            >
              {h}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
