"use client";

import { useCallback, useEffect, useState } from "react";
import SettingsCard from "./SettingsCard";
import Fairway from "./Fairway";
import RosterList from "./RosterList";
import SectionBar from "./SectionBar";
import ManagersGrid from "./ManagersGrid";
import DraftClock, { type DraftClockData } from "./DraftClock";
import { COUNTRY_CLUB_FIELD } from "@/lib/assignments";

type MatchupTeam = { rosterId: number; name: string; points: number; played: boolean };
type Matchup = { matchupId: number; teams: MatchupTeam[] };
type Member = {
  userId: string;
  handle: string;
  team: string | null;
  avatar: string | null;
  isCommissioner?: boolean;
};
type Settings = React.ComponentProps<typeof SettingsCard>["settings"];
type MatchupsData = {
  leagueId: string;
  leagueName: string;
  status: string | null;
  settings: Settings | null;
  members: Member[];
  totalTeams: number;
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
type Resp = {
  connected: boolean;
  week?: number;
  seasonType?: string | null;
  // Where the league id came from ("commissioner" = looked up from the
  // commissioner's Sleeper username) and which season it belongs to.
  source?: "env" | "commissioner" | "legacy";
  commissioner?: string | null;
  leagueSeason?: string | null;
  matchups?: MatchupsData;
  season?: SeasonData;
  draft?: DraftClockData | null;
};

export default function CountryClub() {
  const [data, setData] = useState<Resp | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/sleeper/matchups", { cache: "no-store" });
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

  const m = data?.matchups ?? null;
  const season = data?.season ?? null;
  const leagueId = m?.leagueId ?? season?.leagueId;
  const leagueName = m?.leagueName ?? season?.leagueName;
  const isRegular = data?.seasonType === "regular";
  const status = m?.status ?? season?.status;
  const drafting = status === "drafting";
  const predraft = status === "pre_draft" || drafting;
  const members = m?.members ?? [];
  const draft = data?.draft ?? null;
  const matchups = m?.matchups ?? [];
  const hasMatchups = matchups.some((mm) => mm.teams.some((t) => t.played));

  return (
    <div className="relative">
      <div className="fixed inset-0 z-0">
        <Fairway />
      </div>
      <div className="relative z-10 space-y-10 py-2">
      {/* Broadcast banner */}
      <section
        className="overflow-hidden rounded-2xl border border-white/10"
        style={{ background: "linear-gradient(90deg, rgba(52,209,122,0.18), transparent 85%)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
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
      </section>

      {predraft ? (
        /* Draft dashboard: until Week 1 scores exist, the useful view is who is
           in the league - team name with the Sleeper handle in brackets. */
        <section>
          <SectionBar
            title={drafting ? "Draft board" : "Draft lobby"}
            accent="#34d17a"
            right={
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                {drafting ? "Draft in progress" : "Pre-draft"}
                {data?.leagueSeason ? ` · ${data.leagueSeason}` : ""}
              </span>
            }
          />
          {draft && (
            <div className="mb-5">
              <DraftClock draft={draft} accent="#34d17a" />
            </div>
          )}
          {members.length > 0 ? (
            <ManagersGrid
              members={members}
              accent="#34d17a"
              totalTeams={m?.totalTeams}
              title="Drafting managers"
            />
          ) : (
            <p className="mx-auto max-w-md rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-white/55">
              No managers have joined the Sleeper league yet.
            </p>
          )}
          <p className="mt-4 text-center text-sm text-white/45">
            Head-to-head matchups (Team vs Team, winner highlighted) and standings
            appear once the league drafts and Week 1 kicks off.
          </p>
        </section>
      ) : (
        <>
          {/* Weekly scoreboard */}
          <section>
            <h3 className="chalk font-display mb-1 text-2xl font-semibold uppercase">
              {isRegular ? `Week ${data?.week} matchups` : "Matchups"}
            </h3>
            {!hasMatchups && (
              <p className="mb-3 text-sm text-white/45">
                No scores yet - the scoreboard fills in as games are played.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {matchups.map((mu) => {
                const [a, b] = mu.teams; // sorted high-to-low
                const decided = hasMatchups && a && b && a.points !== b.points;
                return (
                  <div
                    key={mu.matchupId}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    {mu.teams.map((t, i) => {
                      const winner = decided && i === 0;
                      return (
                        <div
                          key={t.rosterId}
                          className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                            winner ? "bg-[#34d17a]/10" : ""
                          }`}
                        >
                          <span
                            className={`min-w-0 flex-1 truncate text-sm ${
                              winner ? "font-bold text-white" : "text-white/70"
                            }`}
                          >
                            {t.name}
                          </span>
                          <span
                            className={`stat-num text-lg tabular-nums ${
                              winner ? "text-[#34d17a]" : "text-white/70"
                            }`}
                          >
                            {t.points.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Season standings */}
          {season && season.rows.length > 0 && (
            <section>
              <h3 className="chalk font-display mb-3 text-2xl font-semibold uppercase">
                Standings
              </h3>
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[2rem_1fr_4rem_5rem] gap-2 border-b border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                  <span>#</span>
                  <span>Team</span>
                  <span className="text-center">W-L-T</span>
                  <span className="text-right">Pts For</span>
                </div>
                {season.rows.map((r, i) => (
                  <div
                    key={r.rosterId}
                    className="grid grid-cols-[2rem_1fr_4rem_5rem] items-center gap-2 border-b border-white/5 px-4 py-2 text-sm last:border-b-0"
                  >
                    <span className="text-xs text-white/40 tabular-nums">{i + 1}</span>
                    <span className="min-w-0 truncate font-medium">{r.name}</span>
                    <span className="stat-num text-center tabular-nums text-white/70">
                      {r.wins}-{r.losses}
                      {r.ties ? `-${r.ties}` : ""}
                    </span>
                    <span className="stat-num text-right tabular-nums text-[#34d17a]">
                      {r.pointsFor.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
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
