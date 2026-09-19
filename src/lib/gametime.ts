// Live-game detection, gated on the REAL NFL schedule via ESPN's public
// scoreboard. The app only polls its own API while an actual game is in
// progress, so off-hours cost is near zero.

// Poll every 1 min while a game is live; otherwise re-check the schedule every
// 5 min (a tiny ESPN call, not our own API).
export const LIVE_POLL_MS = 60 * 1000;
export const IDLE_POLL_MS = 5 * 60 * 1000;

// Fallback window (ET) if the ESPN check ever fails: Thu night, Sun, Mon night.
export function isLiveGameWindow(now: Date = new Date()): boolean {
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const month = et.getMonth();
  const inSeason = month >= 8 || month <= 1; // Sep-Feb
  if (!inSeason) return false;
  const day = et.getDay();
  const h = et.getHours();
  if (day === 0 && h >= 12) return true;
  if (day === 4 && h >= 20) return true;
  if (day === 1 && h >= 19) return true;
  return false;
}

// Cache the ESPN result briefly so multiple pages / rapid ticks share one call.
let cache: { at: number; live: boolean } | null = null;
const CACHE_MS = 45 * 1000;

// True if any NFL game is currently in progress, per ESPN's live scoreboard.
export async function anyGameLive(): Promise<boolean> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.live;
  try {
    const res = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
      { cache: "no-store" },
    );
    if (!res.ok) return isLiveGameWindow();
    const data = (await res.json()) as {
      events?: { status?: { type?: { state?: string } } }[];
    };
    const live = (data.events ?? []).some(
      (e) => e.status?.type?.state === "in",
    );
    cache = { at: now, live };
    return live;
  } catch {
    return isLiveGameWindow();
  }
}
