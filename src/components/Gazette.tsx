"use client";

import { useCallback, useEffect, useState } from "react";
import type { Gazette as GazetteData, GazetteBid, GazetteContest } from "@/lib/sleeper";

// The Guillotine Gazette, rendered live rather than shipped as a flat image.
// Rendering in the browser is why this looks sharp: no JPEG compression, no
// print downscaling, text stays selectable and it reflows on a phone.
//
// Two facts the copy must never get wrong, per the league owner:
//   - A losing bid costs nothing. Only the winning claim is charged, so a
//     runner-up's number is always labelled unpaid.
//   - The highest valid bid always wins. The API already discards failed claims
//     that merely carried a larger number, so nothing here can imply an upset.

type Payload = {
  connected: boolean;
  week: number;
  lastCompleted: number;
  currentWeek: number;
  gazette: GazetteData | null;
};

const money = (n: number | null | undefined) =>
  `$${Number(n ?? 0).toLocaleString("en-US")}`;
const pts = (n: number | null | undefined) =>
  n == null ? "—" : Number(n).toFixed(1);

function Card({
  tone,
  tag,
  team,
  children,
  jab,
}: {
  tone: "bad" | "good" | "cheap";
  tag: string;
  team: string;
  children: React.ReactNode;
  jab: string;
}) {
  const tagBg =
    tone === "bad" ? "#8c1c13" : tone === "good" ? "#1d5c33" : "#6b5b1f";
  return (
    <article className="border border-[#14110d]/80 bg-white/40 p-3">
      <span
        className="font-display inline-block px-2 py-[2px] text-[9px] uppercase tracking-[0.2em] text-[#efe9da]"
        style={{ background: tagBg }}
      >
        {tag}
      </span>
      <h3 className="font-display mt-2 text-lg font-bold uppercase leading-none">
        {team}
      </h3>
      <p className="mt-1.5 text-[13px] leading-snug">{children}</p>
      <p className="mt-2 border-t border-dashed border-[#14110d]/30 pt-1.5 text-[12px] italic text-[#8c1c13]">
        {jab}
      </p>
    </article>
  );
}

export default function Gazette() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [week, setWeek] = useState<number | null>(null);

  const load = useCallback(async (w: number | null) => {
    try {
      setErr(null);
      const res = await fetch(`/api/gazette${w ? `?week=${w}` : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
    } catch {
      setErr("Could not load the Gazette.");
    }
  }, []);

  useEffect(() => {
    void load(week);
  }, [load, week]);

  if (err) {
    return <p className="py-16 text-center text-sm text-white/50">{err}</p>;
  }
  if (!data) {
    return (
      <p className="py-16 text-center text-sm text-white/40">
        Setting the type…
      </p>
    );
  }
  if (!data.connected || !data.gazette) {
    return (
      <p className="py-16 text-center text-sm text-white/50">
        No league connected yet.
      </p>
    );
  }

  const g = data.gazette;
  const a = g.awards;
  const top = g.scores[0];

  // Lead with the most absurd thing available, in descending order of shame.
  const lead =
    a.overkill && a.overkill.gap >= 50
      ? {
          kicker: "Profligacy",
          head: `${money(a.overkill.winner.bid)} when the next bid was ${money(a.overkill.runnerUp?.bid)}`,
          sub: `${a.overkill.winner.team} went ${money(a.overkill.gap)} clear of the field for ${a.overkill.player.name}. Only the winner pays, and the winner paid.`,
        }
      : a.benched
        ? {
            kicker: "Self-inflicted",
            head: `Paid ${money(a.benched.bid)}. Started someone else.`,
            sub: `${a.benched.team} bought ${a.benched.player.name}, watched him post ${pts(a.benched.points)}, and did it from the bench.`,
          }
        : a.flop
          ? {
              kicker: "Buyer's remorse",
              head: `${money(a.flop.bid)} buys ${pts(a.flop.points)} points`,
              sub: `${a.flop.team} on ${a.flop.player.name}. The receipts are public. The shame is permanent.`,
            }
          : {
              kicker: `Week ${g.week}`,
              head: "A quiet week, for once",
              sub: "Nobody distinguished themselves. Try harder.",
            };

  const weeks = Array.from({ length: data.lastCompleted }, (_, i) => i + 1).reverse();

  return (
    <div className="mx-auto max-w-3xl px-3 pb-16">
      {/* week picker - the archive is half the fun */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5">
        {weeks.map((w) => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className={`font-display rounded px-2.5 py-1 text-[11px] uppercase tracking-[0.15em] transition ${
              g.week === w
                ? "bg-[#ef4444] text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            Wk {w}
          </button>
        ))}
      </div>

      {/* the sheet */}
      <div
        className="mx-auto overflow-hidden rounded-sm px-5 py-4 text-[#14110d] shadow-2xl sm:px-7 sm:py-6"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.014) 0 2px, transparent 2px 4px), #efe9da",
        }}
      >
        <div className="border-t-2 border-[#14110d]" />
        <div className="flex justify-between py-1 text-[9px] uppercase tracking-[0.18em]">
          <span>Week {g.week} Dispatch</span>
          <span className="hidden sm:inline">The League&apos;s Paper of Record</span>
          <span>Price: One Waiver Claim</span>
        </div>
        <div className="border-t border-[#14110d]" />

        <h1 className="py-2 text-center font-serif text-[34px] font-black leading-none tracking-tight sm:text-[52px]">
          <span className="mr-1 align-[-2px] text-[26px] sm:text-[38px]">🪓</span>
          The Guillotine Gazette
        </h1>
        <div className="border-t-2 border-[#14110d]" />

        <section className="px-1 pb-2 pt-4 text-center">
          <p className="font-display text-[10px] uppercase tracking-[0.3em] text-[#8c1c13]">
            {lead.kicker}
          </p>
          <h2 className="font-display mt-1.5 text-[26px] font-bold uppercase leading-[0.95] tracking-tight sm:text-[38px]">
            {lead.head}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-[13px] leading-snug sm:text-sm">
            {lead.sub}
          </p>
        </section>

        {/* numbers strip */}
        <div className="my-3 grid grid-cols-3 border-2 border-[#14110d] sm:grid-cols-5">
          {[
            [money(g.totals.spend), "FAAB paid"],
            [String(g.totals.bidsPlaced), "Bids placed"],
            [String(g.totals.bidsLost), "Bids denied"],
            [money(g.totals.freshSpend), "Fresh money"],
            [top ? pts(top.points) : "—", "Top score"],
          ].map(([n, k], i) => (
            <div
              key={k}
              className={`border-[#14110d] px-1 py-2 text-center ${i < 4 ? "border-r" : ""} ${i < 2 ? "border-b sm:border-b-0" : ""}`}
            >
              <div className="font-display text-xl font-bold leading-none">{n}</div>
              <div className="mt-1 text-[8px] uppercase tracking-[0.12em]">{k}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {a.flop && (
            <Card
              tone="bad"
              tag="The Flop"
              team={a.flop.team}
              jab="Refunds are not a feature of this league."
            >
              {money(a.flop.bid)} on <b>{a.flop.player.name}</b> returned{" "}
              <b>{pts(a.flop.points)}</b> points. That is{" "}
              <b>{money(Math.round(a.flop.bid / Math.max(0.1, a.flop.points ?? 0.1)))}</b>{" "}
              per point.
            </Card>
          )}
          {a.benched && (
            <Card
              tone="bad"
              tag="Bench Warmer"
              team={a.benched.team}
              jab="Bought the man. Benched the man. Bold."
            >
              Won <b>{a.benched.player.name}</b> for {money(a.benched.bid)}, then
              left him on the bench while he scored <b>{pts(a.benched.points)}</b>.
            </Card>
          )}
          {a.lowball && (
            <Card
              tone="cheap"
              tag="Penny Pincher"
              team={a.lowball.team}
              jab="That is not a bid, that is a rounding error."
            >
              Offered <b>{money(a.lowball.bid)}</b> for {a.lowball.player.name}.
              It went elsewhere, and the offer cost them nothing.
            </Card>
          )}
          {a.steal && (
            <Card
              tone="good"
              tag="Actual Genius"
              team={a.steal.team}
              jab="Credit where it is due. Do not get used to it."
            >
              Paid {money(a.steal.bid)} for <b>{a.steal.player.name}</b>, got{" "}
              <b>{pts(a.steal.points)}</b>. The only defensible transaction of the
              week.
            </Card>
          )}
        </div>

        {/* bidding war */}
        <h4 className="font-display mt-4 border-b-2 border-[#14110d] pb-1 text-[10px] uppercase tracking-[0.22em]">
          The Bidding War · who wanted it, who paid for it
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#14110d] text-left font-display text-[8px] uppercase tracking-[0.12em]">
                <th className="py-1 pr-2">Player</th>
                <th className="py-1 pr-2">Winner</th>
                <th className="py-1 pr-2 text-right">Paid</th>
                <th className="py-1 pr-2">Next highest</th>
                <th className="py-1 pr-2 text-right">Bid (unpaid)</th>
                <th className="py-1 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {g.contests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-center italic">
                    No contested claims. A peaceful, cowardly week.
                  </td>
                </tr>
              ) : (
                g.contests.map((c: GazetteContest) => (
                  <tr key={c.winner.playerId} className="border-b border-dotted border-[#14110d]/30">
                    <td className="py-1 pr-2 font-bold">{c.player.name}</td>
                    <td className="py-1 pr-2">{c.winner.team}</td>
                    <td className="font-display py-1 pr-2 text-right font-bold text-[#8c1c13] tabular-nums">
                      {money(c.winner.bid)}
                    </td>
                    <td className="py-1 pr-2 text-[#14110d]/60">{c.runnerUp?.team ?? "—"}</td>
                    <td className="font-display py-1 pr-2 text-right tabular-nums text-[#14110d]/60">
                      {c.runnerUp ? money(c.runnerUp.bid) : "—"}
                    </td>
                    <td className="font-display py-1 text-right tabular-nums">{pts(c.points)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1.5fr_1fr]">
          <div>
            <h4 className="font-display border-b-2 border-[#14110d] pb-1 text-[10px] uppercase tracking-[0.22em]">
              The Scoreboard
            </h4>
            <ul className="mt-1 columns-2 gap-4 text-[12px]">
              {g.scores.map((s, i) => (
                <li
                  key={s.rosterId}
                  className="flex justify-between border-b border-dotted border-[#14110d]/25 py-[2px]"
                >
                  <span className="truncate pr-2">{s.team}</span>
                  <span
                    className={`font-display tabular-nums ${
                      i === 0
                        ? "font-bold text-[#1d5c33]"
                        : i === g.scores.length - 1
                          ? "font-bold text-[#8c1c13]"
                          : ""
                    }`}
                  >
                    {pts(s.points)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display border-b-2 border-[#14110d] pb-1 text-[10px] uppercase tracking-[0.22em]">
              Obituaries
            </h4>
            <div className="mt-1.5 border-[3px] border-double border-[#14110d] p-3 text-center">
              <p className="font-display text-[10px] tracking-[0.3em]">R · I · P</p>
              <h3 className="mt-1 font-serif text-xl font-bold">
                {g.chopped ? g.chopped.team : "Nobody"}
              </h3>
              <p className="text-[11px] italic">
                {g.chopped
                  ? `Chopped in Week ${g.week} · ${pts(g.chopped.points)} points`
                  : `All survived Week ${g.week}. Disappointing.`}
              </p>
              {g.chopped && (
                <p className="text-[11px] italic">Lowest score. No appeal. No mercy.</p>
              )}
              <div
                className="mx-auto mt-2 h-12 w-20 rounded-t-full"
                style={{ background: "linear-gradient(#6f6a60, #3a3630)" }}
              />
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[8px] uppercase tracking-[0.12em] text-[#14110d]/55">
          Compiled from Sleeper&apos;s public record · Week {g.week} · Losing bids
          cost nothing; only the winning claim is charged · All bids are real
        </p>
      </div>
    </div>
  );
}
