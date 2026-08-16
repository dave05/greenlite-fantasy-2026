import SeasonBoard from "@/components/SeasonBoard";

const FIVE_LINES = [
  "You're in ⚓ Navy or 🦅 Marine Corps. Fourteen teams each.",
  "Every week, the lowest scorer in your league is out. For good.",
  "Survive thirteen weeks and you win your league.",
  "Week 14: the two survivors redraft, live, against each other.",
  "Weeks 15–16: most points wins the whole thing.",
];

const RULES = [
  ["Your only job is to not finish last", "No records, no playoffs. Thirteenth is survival. Fourteenth is a funeral."],
  ["Elimination is permanent", "No consolation bracket, no buy-back. You're never out of it, and never safe."],
  ["A bad week is a fatal week", "One quiet Sunday ends your year. Check the byes, check the injury report."],
  ["Set your lineup every week", "An abandoned team hands a free pass to whoever would've finished last."],
  ["Eliminated teams release their players", "The waiver wire gets better every week — real starters by Week 10."],
  ["Waivers run on a $1,000 budget", "For the whole season, and it never refills. Spend early, be broke later."],
  ["No trades", "Twenty-eight managers and a weekly execution. No honest way to police it."],
  ["You stay in the channel after you're out", "Heckling from the grave is a feature, not a bug."],
];

const PAYOUTS = [
  ["Champion", "Wins the Week 15–16 final", "$1,500"],
  ["Second", "Loses the final", "$700"],
  ["Navy runner-up", "Last team chopped in ⚓ Navy", "$300"],
  ["Marine runner-up", "Last team chopped in 🦅 Marine Corps", "$300"],
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-16">
      {/* Hero */}
      <header className="mb-12 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-white/40">
          GreenLite · Fantasy Football 2026
        </p>
        <h1 className="text-4xl font-black leading-tight sm:text-6xl">
          Twenty-eight managers.
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
            Two leagues. One survivor each.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-white/60 sm:text-lg">
          Every week, the lowest scorer in your league is gone — for good.
          Survive thirteen weeks to win your side, then the two survivors redraft
          and settle it. Spin in below to find out which flag you fight under.
        </p>
      </header>

      {/* Interactive spin + boards */}
      <SeasonBoard />

      {/* The whole game, in five lines */}
      <section className="mt-16">
        <h2 className="mb-5 text-xl font-bold">The whole game, in five lines</h2>
        <ol className="space-y-2">
          {FIVE_LINES.map((line, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <span className="font-mono text-sm text-white/40">{i + 1}</span>
              <span className="text-sm text-white/80">{line}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Rules */}
      <section className="mt-14">
        <h2 className="mb-5 text-xl font-bold">The game rules</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {RULES.map(([title, body], i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
            >
              <h3 className="text-sm font-semibold">
                <span className="text-white/40">Rule {i + 1} — </span>
                {title}
              </h3>
              <p className="mt-1 text-sm text-white/55">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Money */}
      <section className="mt-14">
        <h2 className="mb-1 text-xl font-bold">💰 The money</h2>
        <p className="mb-5 text-sm text-white/50">
          $100 a team, twenty-eight teams. Total pot:{" "}
          <span className="font-semibold text-white/80">$2,800</span>. Four of
          twenty-eight get paid.
        </p>
        <div className="overflow-hidden rounded-xl border border-white/10">
          {PAYOUTS.map(([who, note, amount], i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.02] px-4 py-3 last:border-b-0"
            >
              <div>
                <p className="text-sm font-semibold">{who}</p>
                <p className="text-xs text-white/45">{note}</p>
              </div>
              <span className="font-mono text-lg font-bold text-emerald-400">
                {amount}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* House rules footer */}
      <footer className="mt-16 border-t border-white/10 pt-8 text-center text-xs text-white/40">
        <p className="mb-2">
          🤝 House rules: talk all the trash you want, aim at the lineup not the
          person, punch up not down, and no scores in top-level messages for 24
          hours. Eliminated? Stay and heckle.
        </p>
        <p>
          Commissioner: Dawit, who went into the same hat as everybody else and
          gets exactly one team. Advisory board: Peter &amp; Art.
        </p>
      </footer>
    </main>
  );
}
