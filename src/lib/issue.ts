// The written edition of a week: the jokes the Wednesday routine wrote, checked
// against the league's joke log, and published to league-memory/issues/. The
// Gazette tab shows them in place of its canned lines when they exist, so the
// site carries the same group-chat stories as the emailed paper and never
// repeats a gag the league has already read.
//
// Fetched from GitHub rather than bundled, so a new week shows up as soon as
// the routine commits it - no redeploy.

import type { ComicLine } from "@/components/ComicStrip";

export type IssueJoke = { section?: string; target?: string | null; premise?: string; text: string };

export type Issue = {
  week: number;
  paper?: {
    headline?: { kicker?: string; head?: string; sub?: string };
    obituary?: string;
  };
  jokes: IssueJoke[];
  comic?: ComicLine[];
};

const BASE =
  process.env.GAZETTE_ISSUE_BASE ||
  "https://raw.githubusercontent.com/dave05/greenlite-fantasy-2026/feat/weekly-chop-and-draft-tools/league-memory/issues";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);

// Keep only well-formed strings: this file is hand-editable, and a typo in it
// should drop a line, not break the page.
function clean(raw: unknown, week: number): Issue | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.week !== week) return null;
  const paper = (r.paper ?? {}) as Record<string, unknown>;
  const h = (paper.headline ?? {}) as Record<string, unknown>;
  const jokes = (Array.isArray(r.jokes) ? r.jokes : [])
    .map((j) => j as Record<string, unknown>)
    .filter((j) => str(j.text))
    .map((j) => ({ section: str(j.section), text: j.text as string }));
  const comic = (Array.isArray(r.comic) ? r.comic : [])
    .map((c) => c as Record<string, unknown>)
    .filter(
      (c) =>
        (c.who === "a" || c.who === "b") &&
        ["talk", "yell", "smug", "react"].includes(c.mood as string) &&
        str(c.text),
    ) as ComicLine[];
  return {
    week,
    paper: {
      headline: str(h.head) ? { kicker: str(h.kicker), head: str(h.head), sub: str(h.sub) } : undefined,
      obituary: str(paper.obituary),
    },
    jokes,
    comic: comic.length === 4 ? comic : undefined,
  };
}

// A minute of caching here, and a per-minute cache-buster on the URL, so an
// edit to the issue shows on the site within about a minute (GitHub's raw CDN
// otherwise holds a file for five).
const cache = new Map<number, { at: number; issue: Issue | null }>();
const TTL_MS = 60 * 1000;

export async function getIssue(week: number): Promise<Issue | null> {
  const hit = cache.get(week);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.issue;
  try {
    const v = Math.floor(Date.now() / TTL_MS);
    const res = await fetch(`${BASE}/week-${week}.json?v=${v}`, { cache: "no-store" });
    const issue = res.ok ? clean(await res.json(), week) : null;
    cache.set(week, { at: Date.now(), issue });
    return issue;
  } catch {
    return null;
  }
}
