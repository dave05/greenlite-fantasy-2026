// Estimated win / survival odds. Sleeper doesn't expose its probabilities, so
// this is our own model: each team's FINAL score is a normal distribution whose
// mean is the projected final (live points for players who've scored, projection
// for the rest) and whose spread comes only from the players still to play. As
// games finish, the mean locks in and the spread shrinks toward certainty - so
// the odds track the live game instead of a stale preseason projection.

import type { TeamDetail } from "./sleeper";

// Per not-yet-played player, sd ~ 60% of projection (fantasy scoring is noisy).
const PLAYER_SD_FRAC = 0.6;

export type TeamDist = { rosterId: number; mean: number; sd: number };

export function teamDistribution(t: TeamDetail): TeamDist {
  let mean = 0;
  let variance = 0;
  for (const p of t.starters) {
    if (p.live > 0) {
      mean += p.live; // already scored - settled, no variance
    } else {
      mean += p.proj; // yet to play - projection with variance
      const sd = Math.max(1, p.proj * PLAYER_SD_FRAC);
      variance += sd * sd;
    }
  }
  return { rosterId: t.rosterId, mean, sd: Math.sqrt(variance) };
}

// Standard normal CDF, Φ(z) (Abramowitz-Stegun 26.2.17).
function normCdf(z: number): number {
  const az = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * az);
  const d = 0.3989423 * Math.exp((-az * az) / 2);
  const poly =
    t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const cdfAz = 1 - d * poly; // Φ(|z|)
  return z >= 0 ? cdfAz : 1 - cdfAz;
}

// Head-to-head: P(A beats B). Returns [pctA, pctB] as whole numbers, clamped to
// 1-99 so a near-certain matchup reads "99 / 1" rather than a jarring "100 / 0".
export function headToHeadPct(a: TeamDist, b: TeamDist): [number, number] {
  const sd = Math.sqrt(a.sd * a.sd + b.sd * b.sd) || 1;
  const pA = normCdf((a.mean - b.mean) / sd);
  const clamp = (n: number) => Math.min(99, Math.max(1, Math.round(n)));
  const pctA = clamp(pA * 100);
  return [pctA, 100 - pctA];
}

// Deterministic normal sample via a small seeded RNG, so the numbers are stable
// between requests (no Math.random, which also keeps this build-safe).
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Survival odds: probability a team is NOT the single lowest this week.
// Monte Carlo over all teams' distributions. Returns Map<rosterId, pct>.
export function survivalPct(dists: TeamDist[], sims = 4000): Map<number, number> {
  const survived = new Map(dists.map((d) => [d.rosterId, 0]));
  const rng = makeRng(dists.length * 7919 + 12345);
  for (let s = 0; s < sims; s++) {
    let lowId = -1;
    let low = Infinity;
    for (const d of dists) {
      const score = d.mean + d.sd * gauss(rng);
      if (score < low) {
        low = score;
        lowId = d.rosterId;
      }
    }
    for (const d of dists) {
      if (d.rosterId !== lowId) survived.set(d.rosterId, (survived.get(d.rosterId) ?? 0) + 1);
    }
  }
  const out = new Map<number, number>();
  for (const d of dists) {
    const pct = ((survived.get(d.rosterId) ?? 0) / sims) * 100;
    out.set(d.rosterId, Math.min(99, Math.max(1, Math.round(pct))));
  }
  return out;
}
