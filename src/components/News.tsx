"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  title: string;
  link: string;
  source: string;
  published: number;
  image?: string;
};
type Resp = { items?: Item[]; sources?: string[] };

const SOURCE_COLOR: Record<string, string> = {
  ProFootballTalk: "#f59e0b",
  "Yahoo NFL": "#8b5cf6",
  ESPN: "#ef4444",
  RotoBaller: "#34d17a",
};

// Thumbnail with a graceful, on-brand fallback tile when there's no image or
// it fails to load.
function Thumb({ src, source, size }: { src?: string; source: string; size: "sm" | "lg" }) {
  const [ok, setOk] = useState(Boolean(src));
  const c = SOURCE_COLOR[source] ?? "#a3a3a3";
  const box =
    size === "lg" ? "h-40 w-full sm:h-full sm:w-56" : "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]";
  if (src && ok) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setOk(false)}
        className={`${box} shrink-0 rounded-lg object-cover`}
      />
    );
  }
  return (
    <div
      className={`${box} flex shrink-0 items-center justify-center rounded-lg`}
      style={{ background: `linear-gradient(135deg, ${c}22, rgba(255,255,255,0.02))` }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="h-6 w-6 opacity-70">
        <ellipse cx="12" cy="12" rx="9" ry="5.5" transform="rotate(-35 12 12)" />
        <path d="M9 12h6" transform="rotate(-35 12 12)" />
      </svg>
    </div>
  );
}

function ago(ts: number): string {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function News() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [sources, setSources] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/news", { cache: "no-store" });
      if (r.ok) {
        const d: Resp = await r.json();
        setItems(d.items ?? []);
        setSources(d.sources ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const run = async () => {
      if (!document.hidden) await load();
      if (active) timer = window.setTimeout(run, 60 * 60 * 1000);
    };
    run();
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return (
    <div className="space-y-8">
      <section className="text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
          Fantasy &amp; NFL wire
        </p>
        <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          The Newsroom
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/45">
          Latest headlines from around the league - injuries, insider reporting, and
          fantasy takes. Refreshes hourly.
        </p>
        {sources.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {sources.map((s) => (
              <span
                key={s}
                className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  color: SOURCE_COLOR[s] ?? "#a3a3a3",
                  borderColor: `${SOURCE_COLOR[s] ?? "#a3a3a3"}55`,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </section>

      {!items ? (
        <p className="py-12 text-center text-sm text-white/40">Loading the wire…</p>
      ) : items.length === 0 ? (
        <p className="mx-auto max-w-md rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/50">
          No headlines right now - check back shortly.
        </p>
      ) : (
        <div className="mx-auto max-w-3xl space-y-3">
          {/* Feature card - the latest story */}
          {(() => {
            const it = items[0];
            const c = SOURCE_COLOR[it.source] ?? "#a3a3a3";
            return (
              <a
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition hover:border-white/20 sm:flex-row"
              >
                <Thumb src={it.image} source={it.source} size="lg" />
                <div className="flex flex-1 flex-col justify-center gap-2 p-5">
                  <span
                    className="w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: c, backgroundColor: `${c}1f` }}
                  >
                    {it.source}
                  </span>
                  <p className="font-display text-xl font-semibold leading-tight text-white/90 group-hover:text-white sm:text-2xl">
                    {it.title}
                  </p>
                  <p className="text-xs text-white/40">
                    {it.published ? ago(it.published) : "Latest"}
                  </p>
                </div>
              </a>
            );
          })()}

          {/* The rest - compact rows with thumbnails */}
          <div className="overflow-hidden rounded-2xl border border-white/10">
            {items.slice(1).map((it, i) => {
              const c = SOURCE_COLOR[it.source] ?? "#a3a3a3";
              return (
                <a
                  key={`${it.link}-${i}`}
                  href={it.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 border-b border-white/[0.06] p-3 transition last:border-b-0 hover:bg-white/[0.03]"
                >
                  <Thumb src={it.image} source={it.source} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-white/85">
                      {it.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/40">
                      <span style={{ color: c }}>{it.source}</span>
                      {it.published ? ` · ${ago(it.published)}` : ""}
                    </p>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 shrink-0 text-white/25"
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-white/30">
        Headlines via public RSS. Not affiliated with the sources shown.
      </p>
    </div>
  );
}
