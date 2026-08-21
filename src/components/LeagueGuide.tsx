import { GAME_RULES } from "@/lib/roster";
import Fantasy101 from "./Fantasy101";

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
      {/* Beginner explainer */}
      <Fantasy101 />

      <div className="h-px bg-white/[0.07]" />

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
