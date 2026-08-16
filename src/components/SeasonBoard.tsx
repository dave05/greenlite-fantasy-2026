"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CAP_PER_LEAGUE,
  LEAGUES,
  LEAGUE_LIST,
  LeagueId,
  MANAGERS,
  TOTAL_MANAGERS,
} from "@/lib/roster";
import LeagueBoard from "./LeagueBoard";

type Assignment = { name: string; league: LeagueId | null; claimedAt: string | null };
type State = {
  players: Assignment[];
  counts: Record<LeagueId, number>;
  remaining: number;
  full: boolean;
  persistent: boolean;
};

// 8-segment wheel, alternating Navy / Marine (even = navy, odd = marine).
const SEGMENTS = 8;
const SEG_DEG = 360 / SEGMENTS;

function wheelGradient(): string {
  const stops: string[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const league = i % 2 === 0 ? LEAGUES.navy : LEAGUES.marine;
    stops.push(`${league.accent} ${i * SEG_DEG}deg ${(i + 1) * SEG_DEG}deg`);
  }
  return `conic-gradient(${stops.join(", ")})`;
}

export default function SeasonBoard() {
  const [state, setState] = useState<State | null>(null);
  const [selected, setSelected] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ name: string; league: LeagueId } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const gradient = useMemo(wheelGradient, []);
  const rotRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {
      /* keep last known state */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const claimedByName = useMemo(() => {
    const map = new Map<string, LeagueId>();
    state?.players.forEach((p) => p.league && map.set(p.name, p.league));
    return map;
  }, [state]);

  const unclaimed = useMemo(
    () => MANAGERS.filter((n) => !claimedByName.has(n)),
    [claimedByName],
  );

  const membersOf = useCallback(
    (id: LeagueId) =>
      (state?.players ?? [])
        .filter((p) => p.league === id)
        .map((p) => p.name)
        .sort((a, b) => a.localeCompare(b)),
    [state],
  );

  async function spin() {
    if (!selected || spinning) return;
    setError(null);
    setResult(null);
    setSpinning(true);

    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selected }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not spin. Try again.");
        setSpinning(false);
        await load();
        return;
      }

      const league: LeagueId = data.league;
      // Land the pointer (top / 0deg) on a random segment of the won league.
      const parity = league === "navy" ? 0 : 1;
      const candidates = Array.from({ length: SEGMENTS }, (_, i) => i).filter(
        (i) => i % 2 === parity,
      );
      const seg = candidates[Math.floor(Date.now() / 97) % candidates.length];
      const segCenter = seg * SEG_DEG + SEG_DEG / 2;
      const cur = rotRef.current;
      const delta = ((-(segCenter + cur) % 360) + 360) % 360;
      const next = cur + 360 * 6 + delta;
      rotRef.current = next;
      setRotation(next);

      // Reveal after the CSS spin finishes.
      window.setTimeout(() => {
        setResult({ name: selected, league });
        setSpinning(false);
        setSelected("");
        load();
      }, 4200);
    } catch {
      setError("Network hiccup. Try spinning again.");
      setSpinning(false);
    }
  }

  const seasonSet = state?.full ?? false;

  return (
    <div className="space-y-10">
      {/* Spin panel */}
      {!seasonSet && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="grid items-center gap-8 md:grid-cols-2">
            {/* Wheel */}
            <div className="flex flex-col items-center">
              <div className="relative h-64 w-64">
                {/* pointer */}
                <div className="wheel-pointer absolute -top-1 left-1/2 z-10 -translate-x-1/2">
                  <div className="h-0 w-0 border-x-[12px] border-t-[20px] border-x-transparent border-t-white" />
                </div>
                <div
                  className="h-64 w-64 rounded-full border-4 border-white/20 shadow-2xl"
                  style={{
                    background: gradient,
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning
                      ? "transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)"
                      : "none",
                  }}
                />
                {/* hub */}
                <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white/20 bg-[#0a0e17] text-2xl">
                  🏈
                </div>
              </div>
              <div className="mt-4 flex gap-4 text-sm">
                {LEAGUE_LIST.map((l) => (
                  <span key={l.id} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: l.accent }}
                    />
                    {l.emoji} {l.short}
                  </span>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Claim your spot &amp; spin</h2>
              <p className="text-sm text-white/60">
                Find your name, spin the wheel, and the football gods (well, the
                cap-balanced RNG) drop you into{" "}
                <span className="text-blue-400">⚓ Navy</span> or{" "}
                <span className="text-red-400">🦅 Marine Corps</span>. Fourteen a
                side. No takebacks.
              </p>

              <label className="block text-sm font-medium text-white/70">
                Your name
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  disabled={spinning || unclaimed.length === 0}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1220] px-4 py-3 text-base outline-none focus:border-white/40 disabled:opacity-50"
                >
                  <option value="">— pick your name —</option>
                  {unclaimed.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={spin}
                disabled={!selected || spinning}
                className="w-full rounded-xl bg-white px-4 py-3 text-base font-bold text-[#0a0e17] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {spinning ? "Spinning…" : "Spin for my league 🎡"}
              </button>

              {error && <p className="text-sm text-red-400">{error}</p>}

              {result && (
                <div
                  className="animate-pop rounded-xl border p-4 text-center"
                  style={{
                    borderColor: LEAGUES[result.league].accent,
                    backgroundColor: `${LEAGUES[result.league].accent}1a`,
                  }}
                >
                  <p className="text-sm text-white/60">{result.name}, you drew</p>
                  <p className="text-2xl font-black">
                    {LEAGUES[result.league].emoji} {LEAGUES[result.league].name}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    Now go not finish last. Draft week of Aug 31.
                  </p>
                </div>
              )}

              <p className="text-xs text-white/40">
                {state
                  ? `${TOTAL_MANAGERS - state.remaining} of ${TOTAL_MANAGERS} managers spun in · ${state.remaining} left`
                  : "Loading the board…"}
                {state && !state.persistent && (
                  <span className="ml-1 text-amber-400/70">
                    (demo mode — no database connected yet)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {seasonSet && (
        <div className="animate-pop rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h2 className="text-2xl font-black">The board is set. 🏈</h2>
          <p className="mt-2 text-white/60">
            All {TOTAL_MANAGERS} managers are in. Fourteen a side. Draft opens the
            week of August 31 — check your byes.
          </p>
        </div>
      )}

      {/* Live boards / dashboard */}
      <div>
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-white/40">
          The two leagues · live board
        </h2>
        <div className="flex flex-col gap-5 lg:flex-row">
          {LEAGUE_LIST.map((l) => (
            <LeagueBoard
              key={l.id}
              league={l}
              members={membersOf(l.id)}
              highlightName={result?.name}
            />
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-white/30">
          Cap: {CAP_PER_LEAGUE} per league. Standings &amp; weekly chops light up
          here once we wire in Sleeper.
        </p>
      </div>
    </div>
  );
}
