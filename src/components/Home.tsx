"use client";

import { useCallback, useEffect, useState } from "react";
import { COUNTRY_CLUB_FIELD, GUILLOTINE_FIELD } from "@/lib/assignments";
import RosterList from "./RosterList";
import Ticker from "./Ticker";
import { anyGameLive, LIVE_POLL_MS, IDLE_POLL_MS } from "@/lib/gametime";

type GRow = { rosterId: number; name: string; owner: string; points: number; projected: number; projFinal: number };
type CRow = {
  rosterId: number;
  name: string;
  owner: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
};

const LEAGUES = [
  {
    id: "guillotine" as const,
    label: "The Guillotine",
    tag: "Elimination",
    sub: "Weekly points · chop from Week 1",
    accent: "#ef4444",
    soft: "rgba(239,68,68,",
    field: GUILLOTINE_FIELD,
  },
  {
    id: "countryclub" as const,
    label: "The Country Club",
    tag: "Classic · Head-to-head",
    sub: "PPR · playoffs · best records",
    accent: "#34d17a",
    soft: "rgba(52,209,122,",
    field: COUNTRY_CLUB_FIELD,
  },
];

const TICKER = [
  "GreenLite Gridiron",
  "Season 2026",
  "The Guillotine · 16 teams",
  "The Country Club · 14 teams",
  "Chop starts Week 1",
  "Last team standing wins",
  "$100 buy-in",
  "Season is live",
];

export default function Home({
  onNavigate,
}: {
  onNavigate: (t: "guillotine" | "countryclub") => void;
}) {
  // Live Sleeper links per league so the cards always point at the right place.
  const [links, setLinks] = useState<Record<string, string | null>>({
    guillotine: null,
    countryclub: null,
  });
  const [gRows, setGRows] = useState<GRow[] | null>(null);
  const [cRows, setCRows] = useState<CRow[] | null>(null);

  const load = useCallback(async () => {
      try {
        const [a, b] = await Promise.all([
          fetch("/api/sleeper/standings", { cache: "no-store" }),
          fetch("/api/sleeper/matchups", { cache: "no-store" }),
        ]);
        const da = a.ok ? await a.json() : null;
        const db = b.ok ? await b.json() : null;
        setLinks({
          guillotine: da?.league?.leagueId
            ? `https://sleeper.com/leagues/${da.league.leagueId}`
            : null,
          countryclub: db?.matchups?.leagueId
            ? `https://sleeper.com/leagues/${db.matchups.leagueId}`
            : null,
        });

        // Guillotine: rank by projected final (like the league page), drop the chopped.
        if (da?.league?.standings) {
          const projById = new Map<number, number>(
            (da.teams ?? []).map((t: { rosterId: number; projected: number }) => [t.rosterId, t.projected]),
          );
          const projFinalById = new Map<number, number>(
            (da.teams ?? []).map((t: { rosterId: number; projFinal: number }) => [t.rosterId, t.projFinal]),
          );
          const ownerById = new Map<number, string>(
            (da.teams ?? []).map((t: { rosterId: number; owner: string }) => [t.rosterId, t.owner]),
          );
          const chopped = new Set<number>(
            (da.eliminated ?? []).map((e: { rosterId: number }) => e.rosterId),
          );
          const rows: GRow[] = da.league.standings
            .filter((s: { rosterId: number; name: string }) => !/^Roster \d+$/.test(s.name) && !chopped.has(s.rosterId))
            .map((s: { rosterId: number; name: string; points: number }) => ({
              rosterId: s.rosterId,
              name: s.name,
              owner: ownerById.get(s.rosterId) ?? "",
              points: s.points,
              projected: projById.get(s.rosterId) ?? 0,
              projFinal: projFinalById.get(s.rosterId) ?? projById.get(s.rosterId) ?? 0,
            }))
            .sort((x: GRow, y: GRow) => y.points - x.points || y.projFinal - x.projFinal);
          setGRows(rows);
        }

        // Country Club: season standings by record.
        if (db?.season?.rows?.length) {
          const ownerById = new Map<number, string>(
            (db.teams ?? []).map((t: { rosterId: number; owner: string }) => [t.rosterId, t.owner]),
          );
          const rows: CRow[] = db.season.rows.map((r: Omit<CRow, "owner">) => ({
            ...r,
            owner: ownerById.get(r.rosterId) ?? "",
          }));
          setCRows(rows);
        }
      } catch {
        /* links/standings stay hidden */
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

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 px-6 py-16 text-center sm:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 90% at 50% -10%, rgba(52,209,122,0.12), transparent 60%), radial-gradient(50% 80% at 15% 120%, rgba(239,68,68,0.10), transparent 60%)",
          }}
        />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.4em] text-white/40">
          GreenLite Gridiron · 2026
        </p>
        <h1 className="relative mt-4 font-display text-6xl font-bold uppercase leading-[0.85] tracking-tighter sm:text-8xl">
          Two leagues.
          <br />
          <span className="bg-gradient-to-r from-red-500 via-white to-[#34d17a] bg-clip-text text-transparent">
            Two types of cut.
          </span>
        </h1>
        <p className="relative mx-auto mt-6 max-w-lg text-sm leading-relaxed text-white/55 sm:text-base">
          In <span className="whitespace-nowrap font-semibold text-red-400">The Guillotine</span>, the
          lowest score each week is gone for good. In{" "}
          <span className="whitespace-nowrap font-semibold text-[#34d17a]">The Country Club</span>, it&apos;s
          head-to-head all the way to the playoffs.
        </p>
      </section>

      {/* Live ticker */}
      <Ticker items={TICKER} accent="#34d17a" />

      {/* Scoreboard cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        {LEAGUES.map((l) => (
          <section
            key={l.id}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition duration-300 hover:border-white/20"
          >
            {/* banner */}
            <div
              className="flex items-center justify-between gap-4 px-6 py-5"
              style={{ background: `linear-gradient(90deg, ${l.soft}0.16), transparent 80%)` }}
            >
              <div className="flex items-center gap-3">
                <span className="h-11 w-1.5 rounded-full" style={{ backgroundColor: l.accent }} />
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: l.accent }}
                  >
                    {l.tag}
                  </p>
                  <h3 className="font-display text-3xl font-bold uppercase leading-none tracking-tight sm:text-4xl">
                    {l.label}
                  </h3>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className="stat-num text-5xl font-bold leading-none sm:text-6xl"
                  style={{ color: l.accent }}
                >
                  {l.field.length}
                </div>
                <div className="mt-1 text-[9px] uppercase tracking-widest text-white/40">
                  teams
                </div>
              </div>
            </div>

            {/* latest standings + single CTA */}
            <div className="p-5 sm:p-6">
              <p className="text-xs text-white/40">{l.sub}</p>
              <div className="mt-4">
                {l.id === "guillotine" ? (
                  gRows && gRows.length > 0 ? (
                    (() => {
                      const anyLive = gRows.some((r) => r.points > 0);
                      return (
                    <ol className="space-y-1">
                      {gRows.map((r, i) => {
                        const onBlock = i === gRows.length - 1;
                        return (
                          <li
                            key={r.rosterId}
                            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm"
                            style={{
                              backgroundColor: onBlock ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.02)",
                              boxShadow: `inset 3px 0 0 ${onBlock ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
                            }}
                          >
                            <span className="w-4 text-right text-xs text-white/40 tabular-nums">{i + 1}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium leading-tight">{r.name}</span>
                              {r.owner && r.owner !== r.name && (
                                <span className="block truncate text-[10px] leading-tight text-white/35">@{r.owner}</span>
                              )}
                            </span>
                            {onBlock && (
                              <span className="rounded bg-red-500/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                                on the block
                              </span>
                            )}
                            {anyLive ? (
                              <span className="text-right">
                                <span className="stat-num block text-sm font-bold leading-none tabular-nums">
                                  {r.points > 0 ? r.points.toFixed(1) : "-"}
                                </span>
                                <span className="stat-num block text-[10px] leading-tight tabular-nums text-white/35">
                                  {r.projFinal.toFixed(1)}
                                </span>
                              </span>
                            ) : (
                              <span className="stat-num text-right text-sm font-bold tabular-nums">
                                {r.projFinal.toFixed(1)}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                      );
                    })()
                  ) : (
                    <RosterList names={l.field} accent={l.accent} />
                  )
                ) : cRows && cRows.length > 0 ? (
                  <ol className="space-y-1">
                    {cRows.map((r, i) => (
                      <li
                        key={r.rosterId}
                        className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] px-2.5 py-1.5 text-sm"
                        style={{ boxShadow: "inset 3px 0 0 rgba(52,209,122,0.5)" }}
                      >
                        <span className="w-4 text-right text-xs text-white/40 tabular-nums">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium leading-tight">{r.name}</span>
                          {r.owner && r.owner !== r.name && (
                            <span className="block truncate text-[10px] leading-tight text-white/35">@{r.owner}</span>
                          )}
                        </span>
                        <span className="stat-num text-xs tabular-nums text-white/60">
                          {r.wins}-{r.losses}
                          {r.ties ? `-${r.ties}` : ""}
                        </span>
                        <span className="stat-num w-14 text-right text-sm font-bold tabular-nums text-[#34d17a]">
                          {r.pointsFor.toFixed(1)}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <RosterList names={l.field} accent={l.accent} />
                )}
              </div>
              <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-5">
                <button
                  onClick={() => onNavigate(l.id)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide transition-all group-hover:gap-2.5"
                  style={{ color: l.accent }}
                >
                  View standings &amp; rules
                  <span aria-hidden>→</span>
                </button>
                {links[l.id] && (
                  <a
                    href={links[l.id]!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-white/40 transition hover:text-white/75"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/sleeper-icon.png" alt="" className="h-4 w-4 rounded" />
                    Open on Sleeper
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                      <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
