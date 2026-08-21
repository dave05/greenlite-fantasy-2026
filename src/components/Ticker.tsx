export default function Ticker({
  items,
  accent = "#34d17a",
}: {
  items: string[];
  accent: string;
}) {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-white/[0.02] py-2.5">
      <div className="flex w-max animate-ticker gap-10 whitespace-nowrap pr-10">
        {row.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
            />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
