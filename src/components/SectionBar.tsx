import { ReactNode } from "react";

// Broadcast-style section header: a solid accent bar + big condensed title,
// with an optional right-aligned slot (a stat, a count, a link).
export default function SectionBar({
  title,
  accent,
  right,
  className = "",
}: {
  title: string;
  accent: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
        <h3 className="font-display text-2xl font-semibold uppercase tracking-tight sm:text-3xl">
          {title}
        </h3>
      </div>
      {right && <div className="shrink-0 text-right">{right}</div>}
    </div>
  );
}
