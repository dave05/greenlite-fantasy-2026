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
};
type Resp = {
  available: boolean;
  year?: string;
  type?: string;
  players?: RankedPlayer[];
};

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE"] as const;

const POS_COLOR: Record<string, string> = {
  QB: "#f59e0b",
  RB: "#34d17a",
  WR: "#60a5fa",
  TE: "#f472b6",
  K: "#a3a3a3",
  DST: "#a3a3a3",
};

export default function Rankings() {
  const [position, setPosition] = useState<(typeof POSITIONS)[number]>("ALL");
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pos: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rankings?position=${pos}`, { cache: "no-store" });
      setData(res.ok ? await res.json() : { available: false });
    } catch {
      setData({ available: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(position);
  }, [position, load]);

  const players = data?.players ?? [];

  return (
    <div className="space-y-8">
      <section className="text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
          Draft prep · {data?.type ?? "Consensus PPR"}
        </p>
        <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          Player Rankings
        </h2>
        <p className="mt-2 text-sm text-white/45">
          Expert consensus to help you draft. Updated live from FantasyPros.
        </p>
      </section>

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

      {/* Board */}
      {loading ? (
        <p className="py-12 text-center text-sm text-white/40">Loading rankings…</p>
      ) : !data?.available ? (
        <p className="mx-auto max-w-md rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/50">
          Rankings are temporarily unavailable.
        </p>
      ) : (
        <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/10">
          {players.map((p) => {
            const pc = POS_COLOR[p.position] ?? "#a3a3a3";
            return (
              <div
                key={`${p.name}-${p.rank}`}
                className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-b-0 odd:bg-white/[0.015]"
              >
                <span className="stat-num w-8 text-center text-2xl font-bold text-white/70">
                  {p.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-xs text-white/40">
                    <span style={{ color: pc }}>{p.posRank || p.position}</span>
                    {p.team ? ` · ${p.team}` : ""}
                    {p.bye ? ` · Bye ${p.bye}` : ""}
                  </p>
                </div>
                {p.tier > 0 && (
                  <span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                    Tier {p.tier}
                  </span>
                )}
                {p.delta !== 0 && (
                  <span
                    className="stat-num w-8 text-right text-xs tabular-nums"
                    style={{ color: p.delta > 0 ? "#34d17a" : "#ef4444" }}
                    title="rank movement"
                  >
                    {p.delta > 0 ? "▲" : "▼"}
                    {Math.abs(p.delta)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Attribution (required) */}
      <p className="text-center text-xs text-white/30">
        Rankings by{" "}
        <a
          href="https://www.fantasypros.com/nfl/rankings/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/50 underline underline-offset-2 hover:text-white/80"
        >
          FantasyPros
        </a>
      </p>
    </div>
  );
}
