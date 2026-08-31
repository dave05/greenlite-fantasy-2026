"use client";

import { useEffect, useState } from "react";

export type RoundClock = {
  round: number;
  state: "complete" | "live" | "upcoming";
  endsAt: number | null;
  picksMade: number;
  picksTotal: number;
};

export type DraftClockData = {
  draftId: string;
  status: string;
  type: string;
  rounds: number;
  teams: number;
  pickTimerSec: number;
  picksMade: number;
  totalPicks: number;
  currentRound: number | null;
  pickInRound: number | null;
  overallPick: number | null;
  pickDeadline: number | null;
  onTheClock: {
    slot: number;
    rosterId: number | null;
    team: string | null;
    handle: string | null;
    avatar: string | null;
  } | null;
  roundClocks: RoundClock[];
};

// h:mm:ss (or m:ss under an hour) - the pick timer, counted down live.
function countdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

// Coarser "time left" for rounds, which run hours out.
function eta(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function DraftClock({
  draft,
  accent,
}: {
  draft: DraftClockData;
  accent: string;
}) {
  // Tick locally so the timer moves every second; the poll only refreshes the
  // deadlines themselves.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const live = draft.status === "drafting";
  const paused = draft.status === "paused";
  const complete = draft.status === "complete" || draft.picksMade >= draft.totalPicks;
  const msLeft = draft.pickDeadline != null ? draft.pickDeadline - now : null;
  const expired = msLeft != null && msLeft <= 0;
  const onClock = draft.onTheClock;

  const label = complete
    ? "Draft complete"
    : paused
      ? "Draft paused"
      : live
        ? "On the clock"
        : "Draft not started";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.25em]"
            style={{ color: accent }}
          >
            {label}
          </p>
          {onClock ? (
            <p className="mt-1 truncate text-lg font-semibold">
              {onClock.team || onClock.handle}
              {onClock.team && onClock.handle && (
                <span className="ml-1.5 text-sm font-normal text-white/40">
                  (@{onClock.handle})
                </span>
              )}
            </p>
          ) : (
            <p className="mt-1 text-lg font-semibold text-white/60">
              {complete ? "All picks are in" : "Waiting on the first pick"}
            </p>
          )}
          {draft.currentRound && draft.pickInRound && (
            <p className="mt-0.5 text-xs text-white/45">
              Round {draft.currentRound} of {draft.rounds} · Pick{" "}
              {draft.pickInRound} of {draft.teams} · #{draft.overallPick} overall ·{" "}
              {draft.type}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div
            className="stat-num text-5xl font-bold leading-none tabular-nums"
            style={{ color: expired ? "#ef4444" : accent }}
          >
            {msLeft != null
              ? countdown(msLeft)
              : draft.pickTimerSec > 0
                ? "--:--"
                : "No timer"}
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-widest text-white/40">
            {expired ? "Timer expired" : "Left on this pick"}
          </div>
        </div>
      </div>

      {/* Per-round clocks: the live round counts down for real, later rounds
          are projected at a full timer per remaining pick. */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {draft.roundClocks.map((r) => {
          const left = r.endsAt != null ? r.endsAt - now : null;
          return (
            <div
              key={r.round}
              className={`rounded-lg border px-2.5 py-2 ${
                r.state === "live"
                  ? "border-white/25 bg-white/[0.06]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[11px] font-semibold text-white/70">
                  R{r.round}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-white/30">
                  {r.picksMade}/{r.picksTotal}
                </span>
              </div>
              <div
                className="stat-num mt-0.5 text-sm tabular-nums"
                style={{
                  color:
                    r.state === "live"
                      ? accent
                      : r.state === "complete"
                        ? "rgba(255,255,255,0.35)"
                        : "rgba(255,255,255,0.55)",
                }}
              >
                {r.state === "complete"
                  ? "Done"
                  : left != null
                    ? `${r.state === "upcoming" ? "≈" : ""}${eta(left)}`
                    : "--"}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-white/35">
        Pick timer {draft.pickTimerSec > 0 ? `${Math.round(draft.pickTimerSec / 60)} min` : "off"} ·
        round times assume every remaining pick uses the full clock · live from Sleeper
      </p>
    </div>
  );
}
