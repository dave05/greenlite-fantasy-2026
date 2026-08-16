import { CAP_PER_LEAGUE, League } from "@/lib/roster";

type Props = {
  league: League;
  members: string[];
  highlightName?: string | null;
};

export default function LeagueBoard({ league, members, highlightName }: Props) {
  const filled = members.length;
  const emptySlots = Math.max(0, CAP_PER_LEAGUE - filled);

  return (
    <section
      className={`flex-1 rounded-2xl border border-white/10 bg-gradient-to-b ${league.gradient} p-5 backdrop-blur-sm`}
    >
      <header className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <span className="text-2xl">{league.emoji}</span>
          {league.name}
        </h3>
        <span
          className="rounded-full px-3 py-1 text-sm font-medium tabular-nums"
          style={{ backgroundColor: `${league.accent}22`, color: league.accent }}
        >
          {filled}/{CAP_PER_LEAGUE}
        </span>
      </header>

      <ol className="space-y-1.5">
        {members.map((name, i) => {
          const isYou = name === highlightName;
          return (
            <li
              key={name}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isYou ? "ring-2 " + league.ring : ""
              }`}
              style={{ backgroundColor: `${league.accent}14` }}
            >
              <span className="w-5 text-right text-xs text-white/40 tabular-nums">
                {i + 1}
              </span>
              <span className="font-medium">{name}</span>
              {isYou && (
                <span
                  className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ backgroundColor: league.accent, color: "#0a0e17" }}
                >
                  You
                </span>
              )}
            </li>
          );
        })}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <li
            key={`empty-${i}`}
            className="flex items-center gap-3 rounded-lg border border-dashed border-white/10 px-3 py-2 text-sm text-white/25"
          >
            <span className="w-5 text-right text-xs tabular-nums">
              {filled + i + 1}
            </span>
            <span className="italic">open spot</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
