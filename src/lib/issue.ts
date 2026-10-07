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

export async function getIssue(week: number): Promise<Issue | null> {
  try {
    const res = await fetch(`${BASE}/week-${week}.json`, { cache: "no-store" });
    if (!res.ok) return null;
    return clean(await res.json(), week);
  } catch {
    return null;
  }
}
