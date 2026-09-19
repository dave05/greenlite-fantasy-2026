"use client";

import { useCallback, useEffect, useState } from "react";

type RankedPlayer = {
  rank: number;
  posRank: string;
  tier: number;
  name: string;
  team: string;
  position: string;
  bye: number | null;
  delta: number;
  proj?: number;
  opp?: string;
  oppRank?: number | null;
};

// Matchup rating from the opponent defense's STRENGTH rank vs this position
// (out of 32). Rank 1 = strongest defense (fewest FPA = hardest matchup);
// rank 32 = weakest (most FPA = easiest).
function matchup(rank: number): { label: string; color: string } {
  if (rank <= 6) return { label: "Hardest", color: "#ef4444" };
  if (rank <= 13) return { label: "Tough", color: "#fb923c" };
  if (rank <= 19) return { label: "Average", color: "#f59e0b" };
  if (rank <= 26) return { label: "Good", color: "#a3e635" };
  return { label: "Elite", color: "#34d17a" };
}
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
type Resp = {
  available: boolean;
  source?: "sleeper" | "fantasypros";
  mode?: "draft" | "weekly";
  week?: number;
  year?: string;
  type?: string;
  players?: RankedPlayer[];
};

// DST comes from Sleeper's DEF projections (the player dump has no defense rank).
const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"] as const;

const POS_COLOR: Record<string, string> = {
  QB: "#f59e0b",
  RB: "#34d17a",
  WR: "#60a5fa",
  TE: "#f472b6",
  K: "#a3a3a3",
  DST: "#a3a3a3",
};

const PAGE_SIZE = 20;

export default function Rankings() {
  const [position, setPosition] = useState<(typeof POSITIONS)[number]>("ALL");
  // Draft is over - weekly (start/sit) is the default view now.
  const [mode, setMode] = useState<"draft" | "weekly">("weekly");
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async (pos: string, m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rankings?position=${pos}&mode=${m}`, {
        cache: "no-store",
      });
      setData(res.ok ? await res.json() : { available: false });
    } catch {
      setData({ available: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(position, mode);
    setPage(1); // back to page 1 whenever the filter changes
  }, [position, mode, load]);

  const allPlayers = data?.players ?? [];
  const isOverall = position === "ALL";
  const isWeekly = mode === "weekly";
  const hasMatchupRanks = allPlayers.some((p) => p.oppRank);
  const pageCount = Math.max(1, Math.ceil(allPlayers.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const players = allPlayers.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-8">
      <section className="text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
          {isWeekly ? data?.type ?? "This week" : `Draft prep · ${data?.type ?? "PPR"}`}
        </p>
        <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          Player Rankings
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/45">
          {isWeekly
            ? `Start/sit help - led by this week's projected points${data?.week ? ` (Week ${data.week})` : ""}, updated every week${hasMatchupRanks ? ", with a light nudge for the opponent matchup. Matchup = opponent defense vs that position by fantasy points allowed (FPA); 1st = strongest defense (toughest)" : ""}.`
            : isOverall
              ? "The overall big board - top 100 across every position, ordered by draft value (live from Sleeper)."
              : "Every player at this position, ranked by draft value (live from Sleeper)."}
        </p>
      </section>

      {/* Draft vs Weekly toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-1">
          {([
            ["weekly", "This week"],
            ["draft", "Draft"],
          ] as const).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold uppercase tracking-wide transition ${
                mode === m ? "bg-[#34d17a] text-[#08170f]" : "text-white/55 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Position filter */}
      <div className="flex flex-wrap justify-center gap-2">
        {POSITIONS.map((p) => (
          <button
            key={p}
            onClick={() => setPosition(p)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold uppercase tracking-wide transition ${
              position === p
                ? "bg-[#34d17a] text-[#08170f]"
                : "border border-white/10 text-white/55 hover:text-white"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Matchup legend (weekly, once ranks exist) */}
      {isWeekly && hasMatchupRanks && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-wide">
          <span className="text-white/35">Matchup (opp defense FPA vs pos · 1st = strongest):</span>
          {[
            ["Hardest", "#ef4444"],
            ["Tough", "#fb923c"],
            ["Average", "#f59e0b"],
            ["Good", "#a3e635"],
            ["Elite", "#34d17a"],
          ].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1" style={{ color }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Board */}
      {loading ? (
        <p className="py-12 text-center text-sm text-white/40">Loading rankings…</p>
      ) : !data?.available ? (
        <p className="mx-auto max-w-md rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/50">
          Rankings are temporarily unavailable.
        </p>
      ) : (
        <>
        {/* Multi-column board: players flow DOWN each column and fill the page. */}
        <div className="mx-auto max-w-6xl [column-fill:balance] gap-3 sm:columns-2 lg:columns-3">
          {players.map((p) => {
            const pc = POS_COLOR[p.position] ?? "#a3a3a3";
            return (
              <div
                key={`${p.name}-${p.position}-${p.rank}`}
                className="mb-2 flex break-inside-avoid items-center gap-3 rounded-xl border border-white/10 bg-white/[0.015] px-3 py-2.5"
              >
                <span className="stat-num w-7 text-center text-xl font-bold text-white/70">
                  {p.rank}
                </span>
                {/* position pill - makes the overall board scannable by role */}
                <span
                  className="w-10 shrink-0 rounded-md border px-1 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: pc, borderColor: `${pc}55` }}
                >
                  {p.posRank || p.position}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">{p.name}</p>
                  {isWeekly ? (
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-white/40">
                      <span>{p.team || "FA"}</span>
                      {p.opp && <span className="text-white/55">vs {p.opp}</span>}
                      {p.opp && p.oppRank && (() => {
                        const mu = matchup(p.oppRank);
                        return (
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            style={{ color: mu.color, backgroundColor: `${mu.color}1f` }}
                            title={`${p.opp} defense ranks ${ordinal(p.oppRank)} of 32 vs ${p.position}s by fantasy points allowed (FPA). 1st = strongest defense = toughest matchup.`}
                          >
                            {mu.label} · {ordinal(p.oppRank)} vs {p.position}
                          </span>
                        );
                      })()}
                    </p>
                  ) : (
                    <p className="text-xs text-white/40">
                      {p.team || "FA"}
                      {p.bye ? ` · Bye ${p.bye}` : ""}
                    </p>
                  )}
                </div>
                {isWeekly ? (
                  <span className="shrink-0 text-right">
                    <span className="stat-num block text-sm font-bold tabular-nums text-[#34d17a]">
                      {(p.proj ?? 0).toFixed(1)}
                    </span>
                    <span className="text-[9px] uppercase tracking-wide text-white/30">
                      proj
                    </span>
                  </span>
                ) : (
                  <>
                    {p.tier > 0 && (
                      <span className="shrink-0 rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                        T{p.tier}
                      </span>
                    )}
                    {p.delta !== 0 && (
                      <span
                        className="stat-num w-7 shrink-0 text-right text-xs tabular-nums"
                        style={{ color: p.delta > 0 ? "#34d17a" : "#ef4444" }}
                        title="rank movement"
                      >
                        {p.delta > 0 ? "▲" : "▼"}
                        {Math.abs(p.delta)}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination - 20 per page */}
        {pageCount > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((n) => Math.max(1, n - 1))}
              disabled={current <= 1}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Prev
            </button>
            <div className="flex gap-1.5">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  aria-current={n === current ? "page" : undefined}
                  className={`h-8 w-8 rounded-lg text-sm font-semibold transition ${
                    n === current
                      ? "bg-[#34d17a] text-[#08170f]"
                      : "border border-white/10 text-white/55 hover:text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((n) => Math.min(pageCount, n + 1))}
              disabled={current >= pageCount}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        )}
        {allPlayers.length > 0 && (
          <p className="mt-3 text-center text-xs text-white/30">
            Showing {start + 1}-{start + players.length} of {allPlayers.length}
          </p>
        )}
        </>
      )}

      {/* Attribution */}
      <p className="text-center text-xs text-white/30">
        Rankings by{" "}
        <a
          href="https://sleeper.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/50 underline underline-offset-2 hover:text-white/80"
        >
          Sleeper
        </a>
      </p>
    </div>
  );
}
