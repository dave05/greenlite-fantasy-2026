"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Cemetery from "./Cemetery";
import GuillotineMark from "./GuillotineMark";
import SettingsCard from "./SettingsCard";
import RosterList from "./RosterList";
import SectionBar from "./SectionBar";
import { GUILLOTINE_FIELD } from "@/lib/assignments";
import { anyGameLive, LIVE_POLL_MS, IDLE_POLL_MS } from "@/lib/gametime";

type Standing = { rosterId: number; name: string; points: number; played: boolean };
type Settings = React.ComponentProps<typeof SettingsCard>["settings"];
type LeagueData = {
  leagueId: string;
  leagueName: string;
  status: string | null;
  settings: Settings | null;
  standings: Standing[];
} | null;
type Eliminated = { week: number; rosterId: number; name: string; points: number };
type TeamPlayer = { id: string; name: string; position: string; team: string; proj: number; live: number };
type TeamDetail = {
  rosterId: number;
  name: string;
  owner: string;
  points: number;
  played: boolean;
  projected: number;
  projFinal: number;
  live: number;
  hasLive: boolean;
  survivePct: number | null;
  starters: TeamPlayer[];
};
type Resp = {
  connected: boolean;
  week?: number;
  seasonType?: string | null;
  eliminationsLive?: boolean;
  eliminationWeek?: number;
  lastCompletedWeek?: number;
  eliminated?: Eliminated[];
  teams?: TeamDetail[];
  league?: LeagueData;
};

const POS_COLOR: Record<string, string> = {
  QB: "#f59e0b",
  RB: "#34d17a",
  WR: "#60a5fa",
  TE: "#f472b6",
  K: "#a3a3a3",
  DEF: "#a3a3a3",
};

const ZONE = {
  chop: { color: "#ef4444", label: "Chop" },
  danger: { color: "#f59e0b", label: "Danger" },
  safe: { color: "#34d17a", label: "Safe" },
} as const;

export default function Guillotine() {
  const [data, setData] = useState<Resp | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/sleeper/standings", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } catch {
      /* ignore */
    }
  }, []);

  // Load once, then poll only DURING live game windows (every 5 min). Off-hours
  // it just re-checks slowly for a window to open - no API hits. Pauses while the
  // tab is hidden; refreshes on focus if a game is on.
  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    load();
    const tick = async () => {
      const live = await anyGameLive();
      if (live && !document.hidden) await load();
      if (active) timer = window.setTimeout(tick, live ? LIVE_POLL_MS : IDLE_POLL_MS);
    };
    timer = window.setTimeout(tick, LIVE_POLL_MS);
    const onVisible = async () => {
      if (!document.hidden && (await anyGameLive())) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const league = data?.league ?? null;
  // Teams already chopped - shown in the memorial, excluded from the live table.
  const eliminated = data?.eliminated ?? [];
  const eliminatedIds = new Set(eliminated.map((e) => e.rosterId));
  const teamById = new Map((data?.teams ?? []).map((t) => [t.rosterId, t]));
  // Unclaimed Sleeper roster slots come back as "Roster N" - never show those.
  // Eliminated teams drop out of the live standings (they're in the graveyard).
  const standings = (league?.standings ?? []).filter(
    (s) => !/^Roster \d+$/.test(s.name) && !eliminatedIds.has(s.rosterId),
  );
  const totalSlots = league?.standings?.length ?? 0;
  const live = data?.eliminationsLive ?? false;
  // Season is underway (draft done, regular season) even before any games score.
  const seasonStarted =
    league?.status === "in_season" || data?.seasonType === "regular";

  // Merge each standing with its team detail (starters + projected points).
  const merged = standings.map((s) => {
    const t = teamById.get(s.rosterId);
    return {
      ...s,
      projected: t?.projected ?? 0,
      projFinal: t?.projFinal ?? t?.projected ?? 0,
      hasLive: t?.hasLive ?? false,
      owner: t?.owner ?? "",
      survivePct: t?.survivePct ?? null,
      starters: t?.starters ?? [],
    };
  });
  // Rank like Sleeper's CHOP tab: by LIVE score (actual points now), so the
  // board reorders as games are played. Projected final is the tiebreak - which
  // orders teams still at 0 before kickoff. Preseason (no data): alphabetical.
  const rows = [...merged].sort((a, b) =>
    seasonStarted
      ? b.points - a.points || b.projFinal - a.projFinal
      : a.name.localeCompare(b.name),
  );
  const n = rows.length;
  const anyLive = merged.some((m) => m.hasLive);
  // Zones apply once we can rank meaningfully (season underway).
  const zonesLive = seasonStarted && n > 0;

  const zoneOf = (i: number): keyof typeof ZONE => {
    const fromBottom = n - 1 - i;
    if (fromBottom === 0) return "chop";
    if (fromBottom <= 3) return "danger"; // the 3 teams just above the block
    return "safe";
  };

  return (
    <div className="relative">
      <div className="fixed inset-0 z-0">
        <Cemetery />
      </div>
      <div className="relative z-10 space-y-8 py-6">
        {/* Guillotine card: broadcast banner + live standings, merged */}
        <section className="overflow-hidden rounded-2xl border border-white/10">
          <div
            className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden px-6 py-7"
            style={{
              background:
                "radial-gradient(120% 140% at 0% 0%, rgba(239,68,68,0.28), transparent 55%), linear-gradient(180deg, rgba(30,10,10,0.55), rgba(0,0,0,0.35))",
            }}
          >
            {/* blood-edge accent along the bottom of the banner */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px]"
              style={{ background: "linear-gradient(90deg,#ef4444,transparent 70%)" }}
            />

            <div className="relative flex items-center gap-4">
              <GuillotineMark className="h-14 w-14 shrink-0 text-white/85 sm:h-16 sm:w-16" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-red-400/80">
                  Elimination · weekly points
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
            <div className="relative shrink-0 text-right">
              <div className="stat-num text-5xl font-bold leading-none text-[#ef4444] sm:text-6xl">
                {GUILLOTINE_FIELD.length}
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-widest text-white/40">
                teams
              </div>
            </div>
          </div>

          {/* Live standings - merged into the same card, under the banner */}
          {n === 0 ? (
            <p
              className="px-6 py-6 text-center text-sm text-white/55"
              style={{
                borderTop: "1px solid rgba(239,68,68,0.15)",
                background: "linear-gradient(180deg, rgba(239,68,68,0.06), rgba(0,0,0,0.35) 45%)",
              }}
            >
              Waiting for managers to join on Sleeper.
            </p>
          ) : (
            <div
              className="p-4 backdrop-blur-sm sm:p-5"
              style={{
                borderTop: "1px solid rgba(239,68,68,0.15)",
                background: "linear-gradient(180deg, rgba(239,68,68,0.06), rgba(0,0,0,0.35) 45%)",
              }}
            >
            {/* Zone legend - always visible once we can rank the table */}
            {zonesLive ? (
              <div className="mb-1 flex items-center justify-center gap-4 text-[10px] font-semibold uppercase tracking-widest">
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
                {totalSlots ? ` of ${totalSlots}` : ""} joined on Sleeper · scores and
                the chop start Week 1
              </p>
            )}
            {zonesLive && (
              <p className="mb-3 text-center text-[11px] text-white/40">
                {anyLive
                  ? `Live Week ${data?.week ?? ""} · big = live, small = projected final`
                  : `Week ${data?.week ?? ""} · ranked by projection until kickoff`}{" "}
                · bar = est. survival · tap for lineup
              </p>
            )}
            <ol className="space-y-1.5">
              {rows.map((s, i) => {
                const z = zonesLive ? zoneOf(i) : null;
                const zc = z ? ZONE[z].color : "rgba(255,255,255,0.14)";
                const open = openId === s.rosterId;
                const isChop = z === "chop";
                const maxProj = Math.max(1, ...s.starters.map((p) => p.proj));
                return (
                  <Fragment key={s.rosterId}>
                    {/* The blade: everything below this line gets chopped */}
                    {zonesLive && isChop && n > 1 && (
                      <li aria-hidden className="flex items-center gap-2 px-1 pt-1">
                        <span
                          className="h-px flex-1"
                          style={{ background: "linear-gradient(90deg,transparent,rgba(239,68,68,0.55))" }}
                        />
                        <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-red-400/90">
                          🪓 Chopping line
                        </span>
                        <span
                          className="h-px flex-1"
                          style={{ background: "linear-gradient(90deg,rgba(239,68,68,0.55),transparent)" }}
                        />
                      </li>
                    )}
                  <li
                    className="overflow-hidden rounded-lg"
                    style={{
                      backgroundColor: z ? `${zc}14` : "rgba(255,255,255,0.03)",
                      boxShadow: `inset 3px 0 0 ${zc}`,
                      ...(isChop
                        ? { outline: "1px solid rgba(239,68,68,0.35)" }
                        : {}),
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : s.rosterId)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-white/[0.03]"
                    >
                      {z && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: zc }}
                          aria-hidden
                        />
                      )}
                      <span className="w-5 text-right text-xs text-white/40 tabular-nums">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium leading-tight">{s.name}</span>
                        {s.owner && s.owner !== s.name && (
                          <span className="block truncate text-[11px] leading-tight text-white/40">
                            @{s.owner}
                          </span>
                        )}
                      </span>
                      {/* estimated survival odds (our model) - Sleeper-style bar */}
                      {zonesLive && s.survivePct != null && (
                        <span className="hidden w-16 shrink-0 sm:block" title="projected survival odds this week (our estimate)">
                          <span className="flex items-center justify-between">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                              <span
                                className="block h-full rounded-full"
                                style={{ width: `${s.survivePct}%`, backgroundColor: zc }}
                              />
                            </span>
                            <span className="stat-num ml-1.5 w-8 text-right text-[11px] tabular-nums text-white/50">
                              {s.survivePct}%
                            </span>
                          </span>
                        </span>
                      )}
                      {z === "chop" && (
                        <span className="rounded bg-red-500/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                          {live ? "on the block" : "last"}
                        </span>
                      )}
                      {/* During live games: big live score + small projected final.
                          Before kickoff: just the projected final (no 0.0s). */}
                      {anyLive ? (
                        <span className="shrink-0 text-right" title="live score / projected final">
                          <span className="stat-num block text-base font-bold leading-none tabular-nums">
                            {s.points > 0 ? s.points.toFixed(1) : "-"}
                          </span>
                          <span className="stat-num block text-[11px] leading-tight tabular-nums text-white/35">
                            {s.projFinal.toFixed(1)}
                          </span>
                        </span>
                      ) : (
                        <span className="stat-num shrink-0 text-right text-base font-bold tabular-nums" title="projected total">
                          {s.projFinal.toFixed(1)}
                        </span>
                      )}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`h-3.5 w-3.5 shrink-0 text-white/35 transition-transform ${open ? "rotate-180" : ""}`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    {open && (
                      <div className="border-t border-white/10 bg-black/20 px-3 py-2.5">
                        {s.starters.length === 0 ? (
                          <p className="py-1 text-center text-xs text-white/40">
                            Lineup not available yet.
                          </p>
                        ) : (
                          <>
                            <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-widest text-white/35">
                              <span className="flex items-center gap-1.5">
                                Starting lineup
                                {s.hasLive && (
                                  <span className="flex items-center gap-1 text-[#34d17a]">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34d17a]" />
                                    Live
                                  </span>
                                )}
                              </span>
                              <span>{s.hasLive ? "Live · Proj" : "Proj"}</span>
                            </div>
                            <ul className="space-y-1.5">
                              {s.starters.map((p) => {
                                const pc = POS_COLOR[p.position] ?? "#a3a3a3";
                                return (
                                  <li key={p.id} className="flex items-center gap-2.5 text-sm">
                                    <span
                                      className="w-9 shrink-0 rounded border px-1 py-0.5 text-center text-[9px] font-bold uppercase"
                                      style={{ color: pc, borderColor: `${pc}55` }}
                                    >
                                      {p.position || "-"}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-white/80">
                                      {p.name}
                                      {p.team && (
                                        <span className="ml-1.5 text-[10px] text-white/30">
                                          {p.team}
                                        </span>
                                      )}
                                    </span>
                                    {s.hasLive ? (
                                      <>
                                        <span
                                          className="stat-num w-11 text-right text-base font-bold tabular-nums"
                                          style={{ color: p.live > 0 ? "#fff" : "rgba(255,255,255,0.3)" }}
                                        >
                                          {p.live > 0 ? p.live.toFixed(1) : "-"}
                                        </span>
                                        <span className="stat-num w-9 text-right text-xs tabular-nums text-white/35">
                                          {p.proj.toFixed(1)}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-white/10 sm:block">
                                          <span
                                            className="block h-full rounded-full"
                                            style={{
                                              width: `${Math.min(100, (p.proj / maxProj) * 100)}%`,
                                              backgroundColor: pc,
                                            }}
                                          />
                                        </span>
                                        <span className="stat-num w-11 text-right tabular-nums text-white/70">
                                          {p.proj.toFixed(1)}
                                        </span>
                                      </>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                            <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
                              <span className="uppercase tracking-wide text-white/45">
                                {s.hasLive ? "Live total" : "Projected total"}
                              </span>
                              <span className="stat-num text-base font-bold tabular-nums text-[#ef4444]">
                                {s.hasLive ? s.points.toFixed(1) : s.projected.toFixed(1)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                  </Fragment>
                );
              })}
            </ol>
            </div>
          )}
        </section>

        {/* In loving memory of - the graveyard of chopped teams. The phrase is
            engraved on the headstone(s), never floating as plain text.
            (Who's currently on the block is already flagged in the standings.) */}
        <section className="mx-auto max-w-2xl">
          {eliminated.length === 0 ? (
            /* Empty state: one large headstone engraved "In loving memory of". */
            <div className="mx-auto w-80 max-w-full">
              <div
                className="relative rounded-t-[9rem] rounded-b-lg border border-white/15 px-8 pb-12 pt-14 text-center"
                style={{
                  background:
                    "radial-gradient(120% 80% at 50% 0%, #454b53 0%, #2c3138 45%, #191c21 100%)",
                  boxShadow:
                    "inset 0 3px 0 rgba(255,255,255,0.16), inset 0 -50px 60px rgba(0,0,0,0.5), 0 24px 50px rgba(0,0,0,0.65)",
                }}
              >
                <p className="font-display text-2xl uppercase tracking-[0.35em] text-white/60">
                  R.I.P.
                </p>
                <div className="mx-auto my-4 h-px w-24 bg-white/20" />
                <p className="font-display text-sm uppercase tracking-[0.3em] text-white/50">
                  In loving memory of
                </p>
                <p className="mt-3 text-sm italic text-white/40">No graves yet.</p>
              </div>
              {/* plinth */}
              <div className="mx-auto -mt-1 h-4 w-[118%] -translate-x-[9%] rounded-md bg-black/60 shadow-[0_10px_24px_rgba(0,0,0,0.6)]" />
            </div>
          ) : (
            <>
              <p className="mb-6 text-center font-display text-lg uppercase tracking-[0.35em] text-white/55">
                In loving memory of
              </p>
              <div className="flex flex-wrap items-end justify-center gap-5">
                {eliminated.map((e) => (
                  <div key={e.rosterId} className="w-52 max-w-full">
                    <div
                      className="relative rounded-t-[6rem] rounded-b-lg border border-white/15 px-5 pb-9 pt-9 text-center"
                      style={{
                        background:
                          "radial-gradient(120% 80% at 50% 0%, #454b53 0%, #2c3138 45%, #191c21 100%)",
                        boxShadow:
                          "inset 0 3px 0 rgba(255,255,255,0.16), inset 0 -40px 50px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.6)",
                      }}
                    >
                      <p className="font-display text-xl uppercase tracking-[0.3em] text-white/50">
                        R.I.P.
                      </p>
                      <div className="mx-auto my-2.5 h-px w-16 bg-white/15" />
                      <p
                        className="truncate font-display text-lg font-bold uppercase leading-tight text-white/90"
                        style={{ textShadow: "0 1px 0 rgba(0,0,0,0.7)" }}
                        title={e.name}
                      >
                        {e.name}
                      </p>
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400/80">
                        🪓 Chopped · Week {e.week}
                      </p>
                      <p className="mt-1 text-xs text-white/40">{e.points.toFixed(1)} pts</p>
                    </div>
                    {/* plinth */}
                    <div className="mx-auto -mt-1 h-3.5 w-[116%] -translate-x-[8%] rounded-md bg-black/60 shadow-[0_8px_20px_rgba(0,0,0,0.55)]" />
                  </div>
                ))}
              </div>
            </>
          )}
          <p className="mx-auto mt-5 max-w-xs text-center text-xs leading-relaxed text-white/35">
            The team with the fewest points each week is chopped, every week,
            until one team is left standing.
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
