"use client";

import { useCallback, useEffect, useState } from "react";

type SlotName = { name: string; pick: number; round: number };
type Draft = {
  league: string;
  name: string;
  emoji: string;
  accent: string;
  draftId: string | null;
  status: string | null;
  startTime: number | null;
  picksMade: number;
  totalPicks: number;
  onClock: SlotName | null;
  onDeck: SlotName | null;
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

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hrs: Math.floor((s % 86400) / 3600),
    min: Math.floor((s % 3600) / 60),
    sec: s % 60,
  };
}
const pad = (n: number) => String(n).padStart(2, "0");

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="stat-num text-4xl font-bold tabular-nums leading-none text-white sm:text-5xl">
        {value}
      </span>
      <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/35">
        {label}
      </span>
    </div>
  );
}
const Sep = () => (
  <span className="stat-num pb-4 text-2xl leading-none text-white/15 sm:text-3xl">:</span>
);

export default function DraftDay() {
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [now, setNow] = useState(0);

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
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
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

  if (!drafts || drafts.length === 0 || now === 0) return null;

  const anyLive = drafts.some(
    (d) => d.status === "drafting" || d.status === "paused",
  );
  const allComplete = drafts.every((d) => d.status === "complete");
  // Both leagues share a start time; round to the minute so it's clean.
  const startRaw = drafts.find((d) => d.startTime)?.startTime ?? 0;
  const start = startRaw ? Math.round(startRaw / 60000) * 60000 : 0;
  const remaining = start - now;
  const startsSoon = !anyLive && remaining <= 0;
  const { days, hrs, min, sec } = parts(remaining);

  const startLabel = start
    ? new Date(start).toLocaleString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      }) + " ET"
    : "TBD";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      {/* dual-league accent hairline: red (Guillotine) -> green (Country Club) */}
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: "linear-gradient(90deg,#ef4444,#eab308 45%,#34d17a)" }}
      />

      {allComplete ? (
        <div className="flex flex-col items-center gap-3 px-6 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
              🏈 Drafts complete
            </p>
            <p className="mt-1 font-display text-xl font-bold uppercase tracking-tight sm:text-2xl">
              Both rosters are set
            </p>
            <p className="mt-0.5 text-xs text-white/40">
              The season is loaded. Good luck out there.
            </p>
          </div>
          <a
            href="#draft"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
          >
            View the draft boards →
          </a>
        </div>
      ) : anyLive ? (
        <div className="px-6 py-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">
              Drafting now
            </span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {drafts.map((d) => (
              <div
                key={d.league}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                style={{ borderLeft: `3px solid ${d.accent}` }}
              >
                <div className="flex items-center gap-2 text-xs text-white/45">
                  <span>{d.emoji}</span>
                  <span className="font-semibold uppercase tracking-wide">{d.name}</span>
                </div>
                {d.status === "drafting" || d.status === "paused" ? (
                  <>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="truncate font-display text-xl font-bold uppercase tracking-tight">
                        {d.onClock?.name ?? "—"}
                      </p>
                      {d.status === "paused" ? (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                          ❚❚ Paused
                        </span>
                      ) : d.pickDeadline ? (
                        <span
                          className="stat-num shrink-0 text-lg font-bold tabular-nums"
                          style={{ color: d.accent }}
                          title="time left on the clock"
                        >
                          {fmtClock(d.pickDeadline - now)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-white/45">
                      on the clock · on deck{" "}
                      <span className="text-white/70">{d.onDeck?.name ?? "—"}</span>
                    </p>
                  </>
                ) : (
                  <p className="mt-1.5 text-sm text-white/50">
                    {d.status === "complete" ? "Draft complete" : "Waiting to start"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 px-6 py-6 sm:flex-row sm:justify-between sm:gap-8 sm:py-5">
          <div className="text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
              Draft day
            </p>
            <p className="mt-1 font-display text-xl font-bold uppercase tracking-tight sm:text-2xl">
              {startLabel}
            </p>
            <p className="mt-0.5 text-xs text-white/40">Both leagues draft together · snake</p>
          </div>

          {startsSoon ? (
            <p className="font-display text-2xl font-bold uppercase tracking-tight text-white/80">
              Starting any minute…
            </p>
          ) : (
            <div className="flex items-start gap-3 sm:gap-4">
              <Unit value={String(days)} label="Days" />
              <Sep />
              <Unit value={pad(hrs)} label="Hrs" />
              <Sep />
              <Unit value={pad(min)} label="Min" />
              <Sep />
              <Unit value={pad(sec)} label="Sec" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
