"use client";

import { useCallback, useEffect, useState } from "react";
import Cemetery from "./Cemetery";
import SettingsCard from "./SettingsCard";
import RosterList from "./RosterList";
import SectionBar from "./SectionBar";
import { GUILLOTINE_FIELD } from "@/lib/assignments";

type Standing = { rosterId: number; name: string; points: number; played: boolean };
type Settings = React.ComponentProps<typeof SettingsCard>["settings"];
type LeagueData = {
  leagueId: string;
  leagueName: string;
  status: string | null;
  settings: Settings | null;
  standings: Standing[];
} | null;
type Resp = {
  connected: boolean;
  week?: number;
  seasonType?: string | null;
  eliminationsLive?: boolean;
  eliminationWeek?: number;
  league?: LeagueData;
};

const ZONE = {
  chop: { color: "#ef4444", label: "Chop" },
  danger: { color: "#f59e0b", label: "Danger" },
  safe: { color: "#34d17a", label: "Safe" },
} as const;

export default function Guillotine() {
  const [data, setData] = useState<Resp | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/sleeper/standings", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30000);
    return () => window.clearInterval(id);
  }, [load]);

  const league = data?.league ?? null;
  const predraft = league?.status === "pre_draft" || league?.status === "drafting";
  // Unclaimed Sleeper roster slots come back as "Roster N" - never show those.
  const standings = (league?.standings ?? []).filter(
    (s) => !/^Roster \d+$/.test(s.name),
  );
  const totalSlots = league?.standings?.length ?? 0;
  const hasScores = standings.some((s) => s.played);
  // With scores: high -> low. Before scores: alphabetical, so it reads as the
  // roster of everyone in the league.
  const rows = hasScores
    ? [...standings].reverse()
    : [...standings].sort((a, b) => a.name.localeCompare(b.name));
  const bottom = hasScores ? standings[0] : null; // lowest cumulative
  const live = data?.eliminationsLive ?? false;
  const n = standings.length;

  const zoneOf = (i: number): keyof typeof ZONE => {
    const fromBottom = n - 1 - i;
    if (fromBottom === 0) return "chop";
    if (fromBottom <= 2) return "danger";
    return "safe";
  };

  return (
    <div className="relative">
      <div className="fixed inset-0 z-0">
        <Cemetery />
      </div>
      <div className="relative z-10 space-y-8 py-6">
        {/* Broadcast banner */}
        <section
          className="overflow-hidden rounded-2xl border border-white/10"
          style={{ background: "linear-gradient(90deg, rgba(239,68,68,0.18), transparent 85%)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
            <div className="flex items-center gap-4">
              <span className="h-14 w-1.5 shrink-0 rounded-full bg-[#ef4444]" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-red-400/80">
                  Elimination · cumulative points
                </p>
                <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-6xl">
                  The Guillotine
                </h2>
                {league && (
                  <a
                    href={`https://sleeper.com/leagues/${league.leagueId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white/80"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/sleeper-icon.png" alt="" className="h-4 w-4 rounded" />
                    View on Sleeper
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                      <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="stat-num text-5xl font-bold leading-none text-[#ef4444] sm:text-6xl">
                {GUILLOTINE_FIELD.length}
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-widest text-white/40">
                teams
              </div>
            </div>
          </div>
        </section>

        {/* Live standings - directly under the banner */}
        {n === 0 ? (
          <p className="mx-auto max-w-md rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-white/55">
            Waiting for managers to join on Sleeper.
          </p>
        ) : (
          <section className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
            {hasScores ? (
              <div className="mb-3 flex items-center justify-center gap-4 text-[10px] font-semibold uppercase tracking-widest">
                {(["chop", "danger", "safe"] as const).map((z) => (
                  <span key={z} className="flex items-center gap-1.5" style={{ color: ZONE[z].color }}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ZONE[z].color }} />
                    {ZONE[z].label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-center text-xs text-white/45">
                {n}
                {totalSlots ? ` of ${totalSlots}` : ""} joined on Sleeper · standings
                light up in Week 1
              </p>
            )}
            <ol className="space-y-1.5">
              {rows.map((s, i) => {
                const z = hasScores ? zoneOf(i) : null;
                const zc = z ? ZONE[z].color : "rgba(255,255,255,0.14)";
                return (
                  <li
                    key={s.rosterId}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                    style={{
                      backgroundColor: z ? `${zc}14` : "rgba(255,255,255,0.03)",
                      boxShadow: `inset 3px 0 0 ${zc}`,
                    }}
                  >
                    <span className="w-5 text-right text-xs text-white/40 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                    <span className="stat-num text-base tabular-nums" title="cumulative points">
                      {hasScores ? s.points.toFixed(1) : "—"}
                    </span>
                    {z === "chop" && (
                      <span className="rounded bg-red-500/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        {live ? "chopped" : "last"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Chopping block - the headstone */}
        <section className="mx-auto w-full max-w-[300px]">
          <div
            className="rounded-t-[8rem] rounded-b-md border border-white/12 px-5 pb-7 pt-9 text-center"
            style={{
              background: "linear-gradient(180deg,#525a62 0%,#333940 55%,#23282e 100%)",
              boxShadow:
                "inset 0 2px 0 rgba(255,255,255,0.14), inset 0 -30px 40px rgba(0,0,0,0.35), 0 14px 34px rgba(0,0,0,0.55)",
            }}
          >
            <p className="font-display text-base tracking-[0.35em] text-white/45">R.I.P.</p>
            {bottom ? (
              <>
                <p
                  className="mt-3 font-display text-2xl font-bold uppercase leading-tight text-white/90"
                  style={{ textShadow: "0 1px 0 rgba(0,0,0,0.7)" }}
                >
                  {bottom.name}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
                  {live ? `Chopped · Week ${data?.week}` : "On the chopping block"} ·{" "}
                  {bottom.points.toFixed(1)} pts
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 font-display text-xl uppercase text-white/35">
                  {predraft ? "Awaiting draft" : "Awaiting kickoff"}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/30">
                  On the chopping block
                </p>
              </>
            )}
          </div>
          <div className="mx-auto -mt-0.5 h-2.5 w-[112%] -translate-x-[6%] rounded-sm bg-black/50" />
          <p className="mx-auto mt-4 max-w-xs text-center text-xs leading-relaxed text-white/35">
            The team with the fewest cumulative points is eliminated each week,
            starting Week 2.
          </p>
        </section>

        {/* The field */}
        <section className="mx-auto max-w-2xl">
          <SectionBar
            title="The Field"
            accent="#ef4444"
            right={
              <span className="stat-num text-2xl text-white/55">
                {GUILLOTINE_FIELD.length}
              </span>
            }
          />
          <RosterList names={GUILLOTINE_FIELD} accent="#ef4444" />
        </section>

        {/* Rules & settings */}
        {league?.settings && (
          <section className="mx-auto max-w-lg">
            <SettingsCard settings={league.settings} format="chopped" accent="#ef4444" />
          </section>
        )}
      </div>
    </div>
  );
}
