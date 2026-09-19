"use client";

import { useCallback, useEffect, useState } from "react";

type Pick = {
  pickNo: number;
  round: number;
  slot: number;
  team: string;
  player: string;
  position: string;
};
type Draft = {
  league: string;
  name: string;
  emoji: string;
  accent: string;
  draftId: string | null;
  status: string | null;
  startTime: number | null;
  rounds: number;
  teams: number;
  pickTimer: number;
  picksMade: number;
  totalPicks: number;
  order: string[];
  picks: Pick[];
  onClock: { name: string; pick: number; round: number } | null;
  onDeck: { name: string; pick: number; round: number } | null;
  pickDeadline: number | null;
};
type Resp = { connected: boolean; drafts?: Draft[] };

function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

const POS_COLOR: Record<string, string> = {
  QB: "#f59e0b",
  RB: "#34d17a",
  WR: "#60a5fa",
  TE: "#f472b6",
  K: "#a3a3a3",
  DEF: "#a3a3a3",
};

const pad = (n: number) => String(n).padStart(2, "0");
function avatarText(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
function pickNoFor(round: number, slot: number, teams: number) {
  return round % 2 === 1
    ? (round - 1) * teams + slot
    : (round - 1) * teams + (teams - slot + 1);
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
      {children}
    </span>
  );
}

function LeagueHeader({ d }: { d: Draft }) {
  const timer = d.pickTimer ? `${Math.round(d.pickTimer / 60)} min clock` : null;
  const live = d.status === "drafting";
  const paused = d.status === "paused";
  const done = d.status === "complete";
  const label = live ? "● Live" : paused ? "❚❚ Paused" : done ? "Complete" : "Upcoming";
  const pillColor = paused ? "#f59e0b" : d.accent;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{d.emoji}</span>
        <h3 className="font-display text-2xl font-bold uppercase tracking-tight">{d.name}</h3>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: live ? "#08170f" : pillColor,
            backgroundColor: live ? d.accent : `${pillColor}1f`,
          }}
        >
          {label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <MetaPill>snake</MetaPill>
        <MetaPill>{d.rounds} rounds</MetaPill>
        <MetaPill>{d.teams} teams</MetaPill>
        {timer && <MetaPill>{timer}</MetaPill>}
      </div>
    </div>
  );
}

// Before the draft: show the round-1 order as a clean lineup (not an empty grid).
function OrderView({ d }: { d: Draft }) {
  const orderSet = d.order.some((t) => !/^Slot \d+$/.test(t));
  if (!orderSet) {
    return (
      <div
        className="rounded-2xl border border-dashed border-white/12 px-5 py-10 text-center"
        style={{ background: `linear-gradient(180deg, ${d.accent}0a, transparent 70%)` }}
      >
        <p className="font-display text-lg uppercase tracking-tight text-white/70">
          Draft order not set yet
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-white/45">
          The commissioner sets the order closer to draft day. It&apos;ll appear here the
          moment it&apos;s locked.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
        Round 1 order · snake reverses each round
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {d.order.map((team, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
            style={i === 0 ? { borderColor: `${d.accent}66` } : undefined}
          >
            <span
              className="stat-num w-7 shrink-0 text-center text-xl font-bold tabular-nums"
              style={{ color: d.accent }}
            >
              {pad(i + 1)}
            </span>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
              style={{ backgroundColor: `${d.accent}1f`, color: d.accent }}
            >
              {avatarText(team)}
            </span>
            <span className="truncate text-sm font-medium" title={team}>
              {team}
            </span>
            {i === 0 && (
              <span className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-wide text-white/35">
                1st pick
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// During / after the draft: the live snake grid.
function GridView({ d, now }: { d: Draft; now: number }) {
  const byCell = new Map(d.picks.map((p) => [`${p.round}-${p.slot}`, p]));
  const cols = `2.4rem repeat(${d.teams}, minmax(6.5rem, 1fr))`;
  const pct = d.totalPicks ? Math.round((d.picksMade / d.totalPicks) * 100) : 0;
  const paused = d.status === "paused";

  return (
    <div>
      {/* On the clock + live pick clock */}
      {d.onClock && d.status !== "complete" && (
        <div
          className="mb-3 flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5"
          style={{
            borderColor: paused ? "#f59e0b55" : `${d.accent}55`,
            background: paused ? "#f59e0b0f" : `${d.accent}0f`,
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: paused ? "#f59e0b" : d.accent }}
            />
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-white/45">
              {paused ? "Paused · up next" : "On the clock"}
            </span>
            <span className="truncate font-display text-sm font-bold uppercase tracking-tight">
              {d.onClock.name}
            </span>
          </div>
          {paused ? (
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-amber-400">
              ❚❚
            </span>
          ) : d.pickDeadline ? (
            <span
              className="stat-num shrink-0 text-xl font-bold tabular-nums"
              style={{ color: d.accent }}
            >
              {fmtClock(d.pickDeadline - now)}
            </span>
          ) : null}
        </div>
      )}

      {/* progress */}
      <div className="mb-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: d.accent }}
          />
        </div>
        <span className="text-xs tabular-nums text-white/45">
          {d.picksMade}/{d.totalPicks}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <div className="min-w-max">
          <div className="grid" style={{ gridTemplateColumns: cols }}>
            <div className="border-b border-white/10 bg-white/[0.03]" />
            {d.order.map((team, i) => (
              <div
                key={i}
                className="border-b border-l border-white/[0.06] bg-white/[0.03] px-2 py-2 text-center"
              >
                <div className="text-[9px] text-white/35">{i + 1}</div>
                <div className="truncate text-[11px] font-semibold text-white/70" title={team}>
                  {team}
                </div>
              </div>
            ))}
          </div>
          {Array.from({ length: d.rounds }, (_, r) => r + 1).map((round) => (
            <div key={round} className="grid" style={{ gridTemplateColumns: cols }}>
              <div className="flex items-center justify-center border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-bold text-white/40">
                {round}
              </div>
              {Array.from({ length: d.teams }, (_, s) => s + 1).map((slot) => {
                const p = byCell.get(`${round}-${slot}`);
                const pc = p ? POS_COLOR[p.position] ?? "#a3a3a3" : "#a3a3a3";
                const isOnClock =
                  d.onClock && pickNoFor(round, slot, d.teams) === d.onClock.pick;
                return (
                  <div
                    key={slot}
                    className="min-h-[3rem] border-b border-l border-white/[0.06] px-2 py-1.5"
                    style={
                      isOnClock
                        ? { boxShadow: `inset 0 0 0 1.5px ${d.accent}`, backgroundColor: `${d.accent}12` }
                        : undefined
                    }
                  >
                    {p ? (
                      <>
                        <p className="truncate text-[11px] font-medium leading-tight" title={p.player}>
                          {p.player}
                        </p>
                        <p className="text-[9px]" style={{ color: pc }}>
                          {p.position} · {p.pickNo}
                        </p>
                      </>
                    ) : isOnClock ? (
                      <p className="text-[10px] font-bold uppercase" style={{ color: d.accent }}>
                        On clock
                      </p>
                    ) : (
                      <p className="text-white/12">·</p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeagueBoard({ d, now }: { d: Draft; now: number }) {
  const started =
    d.status === "drafting" || d.status === "complete" || d.status === "paused";
  return (
    <section>
      <LeagueHeader d={d} />
      {started ? <GridView d={d} now={now} /> : <OrderView d={d} />}
    </section>
  );
}

export default function DraftBoard() {
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/sleeper/draft", { cache: "no-store" });
      if (r.ok) {
        const d: Resp = await r.json();
        setDrafts(d.drafts ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const anyLive = () => (drafts ?? []).some((d) => d.status === "drafting");
    const run = async () => {
      if (!document.hidden) await load();
      if (active) timer = window.setTimeout(run, anyLive() ? 30000 : 90000);
    };
    run();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [load, drafts]);

  return (
    <div className="space-y-10">
      <section className="text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">
          Live from Sleeper · Aug 31, 10:00 AM ET
        </p>
        <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          The Draft Board
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/45">
          Draft order now, every pick live on the day. Teams run in draft order; the
          snake reverses each round.
        </p>
      </section>

      {!drafts ? (
        <p className="py-12 text-center text-sm text-white/40">Loading the board…</p>
      ) : drafts.length === 0 ? (
        <p className="mx-auto max-w-md rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/50">
          No draft found yet.
        </p>
      ) : (
        <div className="space-y-12">
          {drafts.map((d) => (
            <LeagueBoard key={d.league} d={d} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
