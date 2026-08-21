"use client";

import { useEffect, useState } from "react";
import { COUNTRY_CLUB_FIELD, GUILLOTINE_FIELD } from "@/lib/assignments";
import RosterList from "./RosterList";
import Ticker from "./Ticker";

const LEAGUES = [
  {
    id: "guillotine" as const,
    label: "The Guillotine",
    tag: "Elimination",
    sub: "Cumulative points · chop from Week 2",
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
  "Chop starts Week 2",
  "$100 buy-in",
  "Drafts week of Aug 31",
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

  useEffect(() => {
    (async () => {
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
      } catch {
        /* links stay hidden */
      }
    })();
  }, []);

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
          In <span className="font-semibold text-red-400">The Guillotine</span>, the
          lowest score each week is gone for good. In{" "}
          <span className="font-semibold text-[#34d17a]">The Country Club</span>, it&apos;s
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

            {/* roster + single CTA */}
            <div className="p-5 sm:p-6">
              <p className="text-xs text-white/40">{l.sub}</p>
              <div className="mt-5">
                <RosterList names={l.field} accent={l.accent} />
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
