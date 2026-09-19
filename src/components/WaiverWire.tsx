"use client";

import { useCallback, useEffect, useState } from "react";

type TxnPlayer = { name: string; position: string };
type Move = {
  id: string;
  type: "waiver" | "free_agent" | "trade";
  status: string;
  week: number;
  created: number;
  team: string;
  bid: number | null;
  adds: TxnPlayer[];
  drops: TxnPlayer[];
};
type FaabRow = { rosterId: number; name: string; used: number; remaining: number };
type Bid = { team: string; amount: number; won: boolean };
type BidGroup = { id: string; player: TxnPlayer; week: number; created: number; bids: Bid[] };
type Feed = { faabBudget: number | null; faab: FaabRow[]; moves: Move[]; bids: BidGroup[] };
type Resp = { connected: boolean; guillotine?: Feed | null; countryclub?: Feed | null };

const POS_COLOR: Record<string, string> = {
  QB: "#f59e0b",
  RB: "#34d17a",
  WR: "#60a5fa",
  TE: "#f472b6",
  K: "#a3a3a3",
  DST: "#a3a3a3",
  DEF: "#a3a3a3",
};

const LEAGUES = [
  { id: "guillotine" as const, label: "🪓 The Guillotine", accent: "#ef4444" },
  { id: "countryclub" as const, label: "⛳ The Country Club", accent: "#34d17a" },
];

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

function Chip({ p, sign, color }: { p: TxnPlayer; sign: "+" | "-"; color: string }) {
  const pc = POS_COLOR[p.position] ?? "#a3a3a3";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-sm">
      <span className="font-bold" style={{ color }}>
        {sign}
      </span>
      {p.position && (
        <span className="text-[9px] font-bold uppercase" style={{ color: pc }}>
          {p.position}
        </span>
      )}
      <span className="text-white/85">{p.name}</span>
    </span>
  );
}

export default function WaiverWire() {
  const [data, setData] = useState<Resp | null>(null);
  const [league, setLeague] = useState<"guillotine" | "countryclub">("guillotine");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/sleeper/transactions", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const accent = LEAGUES.find((l) => l.id === league)!.accent;
  const feed = data?.[league] ?? null;

  return (
    <div className="space-y-8">
      <section className="text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
          Adds · drops · FAAB
        </p>
        <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          The Waiver Wire
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/45">
          Every pickup, drop and FAAB bid, newest first - live from Sleeper.
        </p>
      </section>

      {/* League toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-1">
          {LEAGUES.map((l) => (
            <button
              key={l.id}
              onClick={() => setLeague(l.id)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold uppercase tracking-wide transition ${
                league === l.id ? "text-[#08170f]" : "text-white/55 hover:text-white"
              }`}
              style={league === l.id ? { backgroundColor: l.accent } : undefined}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {!feed ? (
        <p className="py-12 text-center text-sm text-white/40">Loading the wire…</p>
      ) : (
        <div className="mx-auto max-w-2xl space-y-8">
          {/* FAAB budgets */}
          {feed.faabBudget != null && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
                FAAB remaining · ${feed.faabBudget} budget
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {feed.faab.map((f) => {
                  const pct = feed.faabBudget ? (f.remaining / feed.faabBudget) * 100 : 0;
                  return (
                    <div key={f.rosterId} className="flex items-center gap-2 text-sm">
                      <span className="w-28 shrink-0 truncate text-white/70">{f.name}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${Math.max(0, pct)}%`, backgroundColor: accent }}
                        />
                      </span>
                      <span className="stat-num w-12 shrink-0 text-right tabular-nums text-white/60">
                        ${f.remaining}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FAAB bids grouped by player (winner + who they outbid) */}
          {feed.bids.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
                FAAB bids by player
              </p>
              <ol className="space-y-2">
                {feed.bids.map((g) => {
                  const pc = POS_COLOR[g.player.position] ?? "#a3a3a3";
                  return (
                    <li
                      key={g.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                      style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          {g.player.position && (
                            <span className="text-[9px] font-bold uppercase" style={{ color: pc }}>
                              {g.player.position}
                            </span>
                          )}
                          <span className="truncate font-semibold text-white/90">
                            {g.player.name}
                          </span>
                        </span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-white/35">
                          Wk {g.week} · {g.bids.length} bid{g.bids.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {g.bids.map((b, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              {b.won ? (
                                <span className="shrink-0 text-[10px] font-bold uppercase text-[#34d17a]">
                                  won
                                </span>
                              ) : (
                                <span className="shrink-0 text-[10px] uppercase text-white/25">
                                  lost
                                </span>
                              )}
                              <span className={`truncate ${b.won ? "text-white/85" : "text-white/45 line-through"}`}>
                                {b.team}
                              </span>
                            </span>
                            <span
                              className="stat-num shrink-0 tabular-nums"
                              style={{ color: b.won ? "#34d17a" : "rgba(255,255,255,0.4)" }}
                            >
                              ${b.amount}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Move feed */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Recent moves
            </p>
            {feed.moves.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/50">
                No moves yet this week.
              </p>
            ) : (
              <ol className="space-y-2">
                {feed.moves.map((m) => {
                  const failed = m.status === "failed";
                  return (
                    <li
                      key={m.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                      style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate font-semibold text-white/85">
                          {m.team}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-white/40">
                          {m.bid != null && (
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                              style={{ color: accent, backgroundColor: `${accent}1f` }}
                            >
                              ${m.bid} FAAB
                            </span>
                          )}
                          {failed && (
                            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-400">
                              failed
                            </span>
                          )}
                          <span>Wk {m.week}</span>
                          <span>· {ago(m.created)}</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.adds.map((p, i) => (
                          <Chip key={`a${i}`} p={p} sign="+" color="#34d17a" />
                        ))}
                        {m.drops.map((p, i) => (
                          <Chip key={`d${i}`} p={p} sign="-" color="#ef4444" />
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
