type LeagueSettings = {
  starters: string[];
  benchCount: number;
  ppr: number;
  passTd: number;
  playoffWeekStart: number | null;
  playoffTeams: number | null;
  faabBudget: number | null;
  tradeDeadline: number | null;
  tradesDisabled: boolean;
  maxKeepers: number | null;
};

const POS_LABEL: Record<string, string> = {
  SUPER_FLEX: "SFLEX",
  WRRB_FLEX: "W/R",
  REC_FLEX: "W/T",
  IDP_FLEX: "IDP",
};

function rosterSummary(starters: string[]): string {
  const counts = new Map<string, number>();
  for (const p of starters) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts.entries()].map(([p, c]) => `${c} ${POS_LABEL[p] ?? p}`).join(" · ");
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs uppercase tracking-wider text-white/40">{label}</span>
      <span className="stat-num text-right text-sm text-white/85">{value}</span>
    </div>
  );
}

export default function SettingsCard({
  settings,
  format,
  accent,
  eliminationWeek = 2,
}: {
  settings: LeagueSettings;
  format: "chopped" | "regular";
  accent: string;
  eliminationWeek?: number;
}) {
  const s = settings;
  const rows: { label: string; value: string }[] = [
    { label: "Buy-in", value: "$100 / team" },
    {
      label: "Format",
      value:
        format === "chopped"
          ? `Cumulative points · chop from Wk ${eliminationWeek}`
          : "Head-to-head · win or lose, you stay",
    },
    { label: "Starters", value: rosterSummary(s.starters) },
    { label: "Bench", value: `${s.benchCount}` },
    { label: "Scoring", value: `PPR (${s.ppr}) · ${s.passTd}pt pass TD` },
    {
      label: "Waivers",
      value: s.faabBudget ? `FAAB $${s.faabBudget}` : "Rolling priority",
    },
    {
      label: "Trades",
      value: s.tradesDisabled
        ? "Disabled"
        : s.tradeDeadline
          ? `Allowed · deadline Wk ${s.tradeDeadline}`
          : "Allowed",
    },
  ];
  if (format === "regular" && s.playoffTeams && s.playoffWeekStart) {
    rows.push({
      label: "Playoffs",
      value: `${s.playoffTeams} teams · from Wk ${s.playoffWeekStart}`,
    });
  }
  if (s.maxKeepers) rows.push({ label: "Keepers", value: `${s.maxKeepers}` });
  rows.push({ label: "Prize", value: "TBD — set per league" });

  return (
    <div
      className="rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <h3 className="chalk font-display mb-1 text-lg font-bold uppercase tracking-wide">
        Rules &amp; settings
      </h3>
      <p className="mb-2 text-xs text-white/40">Pulled live from Sleeper.</p>
      <div className="divide-y divide-white/5">
        {rows.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}
      </div>
    </div>
  );
}
