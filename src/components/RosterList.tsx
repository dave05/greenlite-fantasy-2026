function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function RosterList({
  names,
  accent,
}: {
  names: string[];
  accent: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {names.map((n, i) => (
        <div
          key={`${n}-${i}`}
          className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 transition hover:border-white/15 hover:bg-white/[0.04]"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ backgroundColor: `${accent}1f`, color: accent }}
          >
            {initials(n)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-white/85">{n}</span>
          <span className="font-mono text-[11px] tabular-nums text-white/25">
            {String(i + 1).padStart(2, "0")}
          </span>
        </div>
      ))}
    </div>
  );
}
