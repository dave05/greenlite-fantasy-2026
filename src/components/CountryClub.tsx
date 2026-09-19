"use client";

import { useCallback, useEffect, useState } from "react";
import SettingsCard from "./SettingsCard";
import Fairway from "./Fairway";
import RosterList from "./RosterList";
import SectionBar from "./SectionBar";
import { COUNTRY_CLUB_FIELD } from "@/lib/assignments";
import { anyGameLive, LIVE_POLL_MS, IDLE_POLL_MS } from "@/lib/gametime";

type MatchupTeam = { rosterId: number; name: string; points: number; played: boolean };
type Matchup = { matchupId: number; teams: MatchupTeam[] };
type Settings = React.ComponentProps<typeof SettingsCard>["settings"];
type Team = { rosterId: number; name: string };
type MatchupsData = {
  leagueId: string;
  leagueName: string;
  status: string | null;
  settings: Settings | null;
  teams: Team[];
  week: number;
  matchups: Matchup[];
} | null;
type SeasonRow = {
  rosterId: number;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
};
type SeasonData = { leagueId: string; leagueName: string; status: string | null; rows: SeasonRow[] } | null;
type TeamPlayer = { id: string; name: string; position: string; team: string; proj: number; live: number };
type TeamDetail = {
  rosterId: number;
  name: string;
  owner: string;
  points: number;
  played: boolean;
  projected: number;
  live: number;
  hasLive: boolean;
  starters: TeamPlayer[];
};
type Resp = {
  connected: boolean;
  week?: number;
  seasonType?: string | null;
  matchups?: MatchupsData;
  season?: SeasonData;
  teams?: TeamDetail[];
  winPct?: Record<number, number>;
};

const POS_COLOR: Record<string, string> = {
  QB: "#f59e0b",
  RB: "#34d17a",
  WR: "#60a5fa",
  TE: "#f472b6",
  K: "#a3a3a3",
  DEF: "#a3a3a3",
};

export default function CountryClub() {
  const [data, setData] = useState<Resp | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [openMatch, setOpenMatch] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/sleeper/matchups", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } catch {
      /* ignore */
    }
  }, []);

  // Load once, then poll only DURING live game windows (every 5 min).
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

  const m = data?.matchups ?? null;
  const season = data?.season ?? null;
  const teams = m?.teams ?? [];
  const teamById = new Map((data?.teams ?? []).map((t) => [t.rosterId, t]));
  const winPct = data?.winPct ?? {};
  const week = data?.week;
  const leagueId = m?.leagueId ?? season?.leagueId;
  const leagueName = m?.leagueName ?? season?.leagueName;
  const isRegular = data?.seasonType === "regular";
  const predraft = (m?.status ?? season?.status) === "pre_draft" || (m?.status ?? season?.status) === "drafting";
  const matchups = m?.matchups ?? [];
  const hasMatchups = matchups.some((mm) => mm.teams.some((t) => t.played));

  return (
    <div className="relative">
      <div className="fixed inset-0 z-0">
        <Fairway />
      </div>
      <div className="relative z-10 space-y-10 py-2">
      {/* Country Club card: broadcast banner + weekly scoreboard, merged */}
      <section className="overflow-hidden rounded-2xl border border-white/10">
        <div
          className="flex flex-wrap items-center justify-between gap-4 px-6 py-6"
          style={{ background: "linear-gradient(90deg, rgba(52,209,122,0.18), transparent 85%)" }}
        >
          <div className="flex items-center gap-4">
            <span className="h-14 w-1.5 shrink-0 rounded-full bg-[#34d17a]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#34d17a]/80">
                Classic · head-to-head PPR
              </p>
              <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-6xl">
                The Country Club
              </h2>
              {leagueId && (
                <a
                  href={`https://sleeper.com/leagues/${leagueId}`}
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
            <div className="stat-num text-5xl font-bold leading-none text-[#34d17a] sm:text-6xl">
              {COUNTRY_CLUB_FIELD.length}
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-widest text-white/40">
              teams
            </div>
          </div>
        </div>

        {/* body merged into the same card, under the banner */}
        <div
          className="p-4 backdrop-blur-sm sm:p-5"
          style={{
            borderTop: "1px solid rgba(52,209,122,0.15)",
            background: "linear-gradient(180deg, rgba(52,209,122,0.06), rgba(0,0,0,0.35) 45%)",
          }}
        >
          {predraft ? (
            teams.length === 0 ? (
              <p className="py-2 text-center text-sm text-white/55">
                Waiting for managers to join on Sleeper.
              </p>
            ) : (
              <>
                <p className="mb-3 text-center text-xs text-white/45">
                  {teams.length} of {COUNTRY_CLUB_FIELD.length} joined on Sleeper ·
                  matchups start Week 1
                </p>
                <ol className="space-y-1.5">
                  {teams.map((t, i) => (
                    <li
                      key={t.rosterId}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.03)",
                        boxShadow: "inset 3px 0 0 rgba(52,209,122,0.5)",
                      }}
                    >
                      <span className="w-5 text-right text-xs text-white/40 tabular-nums">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                    </li>
                  ))}
                </ol>
              </>
            )
          ) : (
            <>
              <h3 className="chalk font-display mb-1 text-2xl font-semibold uppercase">
                {isRegular ? `Week ${data?.week} matchups` : "Matchups"}
              </h3>
              <p className="mb-3 text-xs text-white/40">
                {hasMatchups
                  ? "Tap a matchup for the head-to-head lineups."
                  : `No scores yet - showing projections for Week ${data?.week ?? ""}. Tap a matchup for the lineups.`}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
              {matchups.map((mu) => {
                const [a, b] = mu.teams; // sorted high-to-low
                const decided = hasMatchups && a && b && a.points !== b.points;
                const open = openMatch === mu.matchupId;
                const detA = a ? teamById.get(a.rosterId) : undefined;
                const detB = b ? teamById.get(b.rosterId) : undefined;
                const projA = detA?.projected ?? 0;
                const projB = detB?.projected ?? 0;
                // Projected edge highlight before real scores exist.
                const projFav = !hasMatchups && projA !== projB ? (projA > projB ? 0 : 1) : -1;
                return (
                  <div
                    key={mu.matchupId}
                    className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMatch(open ? null : mu.matchupId)}
                      className="w-full text-left transition hover:bg-white/[0.02]"
                    >
                      {mu.teams.map((t, i) => {
                        const winner = decided && i === 0;
                        const favored = projFav === i;
                        const proj = i === 0 ? projA : projB;
                        return (
                          <div
                            key={t.rosterId}
                            className={`flex items-center justify-between gap-3 px-3 py-2 ${
                              winner ? "bg-[#34d17a]/10" : ""
                            }`}
                          >
                            <span
                              className={`min-w-0 flex-1 truncate text-sm ${
                                winner || favored ? "font-bold text-white" : "text-white/70"
                              }`}
                            >
                              {t.name}
                            </span>
                            {winPct[t.rosterId] != null && (
                              <span
                                className="stat-num shrink-0 text-xs tabular-nums"
                                style={{ color: winPct[t.rosterId] >= 50 ? "#34d17a" : "rgba(255,255,255,0.4)" }}
                                title="projected win probability (our estimate)"
                              >
                                {winPct[t.rosterId]}%
                              </span>
                            )}
                            {hasMatchups ? (
                              <span
                                className={`stat-num text-lg tabular-nums ${
                                  winner ? "text-[#34d17a]" : "text-white/70"
                                }`}
                              >
                                {t.points.toFixed(1)}
                              </span>
                            ) : (
                              <span className="flex items-baseline gap-1">
                                <span
                                  className={`stat-num text-lg tabular-nums ${
                                    favored ? "text-[#34d17a]" : "text-white/60"
                                  }`}
                                >
                                  {proj.toFixed(1)}
                                </span>
                                <span className="text-[9px] uppercase tracking-wide text-white/30">
                                  proj
                                </span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </button>

                    {open && (
                      <div className="border-t border-white/10 bg-black/20 p-3">
                        {!detA || !detB || detA.starters.length === 0 ? (
                          <p className="py-1 text-center text-xs text-white/40">
                            Lineups not available yet.
                          </p>
                        ) : (
                          <>
                            {(() => {
                              const mLive = detA.hasLive || detB.hasLive;
                              const projFinal = (t: TeamDetail) =>
                                t.starters.reduce((sum, p) => sum + (p.live > 0 ? p.live : p.proj), 0);
                              // Score cell: live on top (primary), projection small below.
                              const cell = (p: TeamPlayer | undefined, win: boolean, align: "left" | "right") => {
                                // In live mode, a player who hasn't scored yet shows a dash, not 0.0.
                                const played = !!p && p.live > 0;
                                const primary = !p
                                  ? "-"
                                  : mLive
                                    ? played
                                      ? p.live.toFixed(1)
                                      : "-"
                                    : p.proj.toFixed(1);
                                return (
                                  <span className={`w-12 shrink-0 ${align === "left" ? "text-left" : "text-right"}`}>
                                    <span
                                      className="stat-num block text-sm font-bold leading-none tabular-nums"
                                      style={{ color: !p ? "rgba(255,255,255,0.3)" : win ? "#34d17a" : mLive && !played ? "rgba(255,255,255,0.3)" : mLive ? "#fff" : "rgba(255,255,255,0.7)" }}
                                    >
                                      {primary}
                                    </span>
                                    {p && mLive && (
                                      <span className="stat-num block text-[9px] leading-tight tabular-nums text-white/30">
                                        {p.proj.toFixed(1)}
                                      </span>
                                    )}
                                  </span>
                                );
                              };
                              return (
                                <>
                                  <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-white/45">
                                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                                    <span className="flex items-center gap-1 px-2 text-white/25">
                                      {mLive && (
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34d17a]" />
                                      )}
                                      vs
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-right">{b.name}</span>
                                  </div>
                                  {mLive && (
                                    <div className="mb-1.5 flex items-center justify-between text-[9px] uppercase tracking-widest text-white/30">
                                      <span>live / proj</span>
                                      <span>live / proj</span>
                                    </div>
                                  )}
                                  <ul className="space-y-1.5">
                                    {detA.starters.map((pa, idx) => {
                                      const pb = detB.starters[idx];
                                      const pos = pa.position || pb?.position || "-";
                                      const pc = POS_COLOR[pos] ?? "#a3a3a3";
                                      const av = mLive ? pa.live : pa.proj;
                                      const bv = pb ? (mLive ? pb.live : pb.proj) : null;
                                      const leftWin = bv != null && av > bv;
                                      const rightWin = bv != null && bv > av;
                                      return (
                                        <li key={idx} className="flex items-center gap-1.5 text-[11px]">
                                          {cell(pa, leftWin, "left")}
                                          <span className="min-w-0 flex-1 truncate text-right text-white/70">
                                            {pa.name}
                                          </span>
                                          <span
                                            className="w-9 shrink-0 rounded border px-1 py-0.5 text-center text-[9px] font-bold uppercase"
                                            style={{ color: pc, borderColor: `${pc}55` }}
                                          >
                                            {pos}
                                          </span>
                                          <span className="min-w-0 flex-1 truncate text-white/70">
                                            {pb?.name ?? "-"}
                                          </span>
                                          {cell(pb, rightWin, "right")}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                  <div className="mt-2 border-t border-white/10 pt-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="stat-num font-bold tabular-nums text-[#34d17a]">
                                        {(mLive ? detA.live : projA).toFixed(1)}
                                      </span>
                                      <span className="text-[10px] uppercase tracking-wide text-white/40">
                                        {mLive ? "Live now" : "Projected total"}
                                      </span>
                                      <span className="stat-num font-bold tabular-nums text-[#34d17a]">
                                        {(mLive ? detB.live : projB).toFixed(1)}
                                      </span>
                                    </div>
                                    {mLive && (
                                      <div className="mt-1 flex items-center justify-between text-[10px] text-white/35">
                                        <span className="stat-num tabular-nums">{projFinal(detA).toFixed(1)}</span>
                                        <span className="uppercase tracking-wide">Proj. final</span>
                                        <span className="stat-num tabular-nums">{projFinal(detB).toFixed(1)}</span>
                                      </div>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Season standings - its own card below, matching the merged banner */}
      {!predraft && season && season.rows.length > 0 && (
            <section>
              <h3 className="chalk font-display mb-1 text-2xl font-semibold uppercase">
                Standings
              </h3>
              <p className="mb-3 text-xs text-white/40">Tap a team for its lineup.</p>
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[2rem_1fr_4rem_5rem_1rem] gap-2 border-b border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                  <span>#</span>
                  <span>Team</span>
                  <span className="text-center">W-L-T</span>
                  <span className="text-right">Pts For</span>
                  <span />
                </div>
                {season.rows.map((r, i) => {
                  const t = teamById.get(r.rosterId);
                  const open = openId === r.rosterId;
                  return (
                    <div key={r.rosterId} className="border-b border-white/5 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : r.rosterId)}
                        className="grid w-full grid-cols-[2rem_1fr_4rem_5rem_1rem] items-center gap-2 px-4 py-2 text-left text-sm transition hover:bg-white/[0.03]"
                      >
                        <span className="text-xs text-white/40 tabular-nums">{i + 1}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium leading-tight">{r.name}</span>
                          {t?.owner && t.owner !== r.name && (
                            <span className="block truncate text-[11px] leading-tight text-white/40">
                              @{t.owner}
                            </span>
                          )}
                        </span>
                        <span className="stat-num text-center tabular-nums text-white/70">
                          {r.wins}-{r.losses}
                          {r.ties ? `-${r.ties}` : ""}
                        </span>
                        <span className="stat-num text-right tabular-nums text-[#34d17a]">
                          {r.pointsFor.toFixed(1)}
                        </span>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`h-3.5 w-3.5 text-white/35 transition-transform ${open ? "rotate-180" : ""}`}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      {open && (
                        <div className="bg-black/20 px-4 py-2.5">
                          {!t || t.starters.length === 0 ? (
                            <p className="py-1 text-center text-xs text-white/40">
                              Lineup not available yet.
                            </p>
                          ) : (
                            <>
                              <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-widest text-white/35">
                                <span>Starting lineup</span>
                                <span>Proj{week ? ` · Wk ${week}` : ""}</span>
                              </div>
                              <ul className="space-y-1">
                                {t.starters.map((p) => {
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
                                      </span>
                                      <span className="text-[10px] text-white/35">{p.team}</span>
                                      <span className="stat-num w-12 text-right tabular-nums text-white/70">
                                        {p.proj.toFixed(1)}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
                                <span className="uppercase tracking-wide text-white/45">
                                  Projected total
                                </span>
                                <span className="stat-num text-sm font-bold tabular-nums text-[#34d17a]">
                                  {t.projected.toFixed(1)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
      )}

      {/* The field */}
      <section className="mx-auto max-w-2xl">
        <SectionBar
          title="The Field"
          accent="#34d17a"
          right={
            <span className="stat-num text-2xl text-white/55">
              {COUNTRY_CLUB_FIELD.length}
            </span>
          }
        />
        <RosterList names={COUNTRY_CLUB_FIELD} accent="#34d17a" />
      </section>

      {m?.settings && (
        <section className="mx-auto max-w-lg">
          <SettingsCard settings={m.settings} format="regular" accent="#34d17a" />
        </section>
      )}
      </div>
    </div>
  );
}
