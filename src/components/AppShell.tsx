"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { LEAGUES, LeagueId } from "@/lib/roster";
import SeasonBoard from "./SeasonBoard";
import ChatChannel from "./ChatChannel";

export type Me = { name: string; league: LeagueId | null };

const STORAGE_KEY = "gl_me";
const TABS = [
  { id: "board", label: "🏈 Board" },
  { id: "channel", label: "💬 Channel" },
  { id: "rules", label: "📕 Rules" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AppShell({ rules }: { rules: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<TabId>("board");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMe(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const identify = useCallback((name: string, league: LeagueId | null = null) => {
    const next = { name, league };
    setMe(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const signOut = useCallback(() => {
    setMe(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const league = me?.league ? LEAGUES[me.league] : null;

  return (
    <div>
      {/* Identity + tabs bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-8 border-b border-white/10 bg-[#0a0e17]/80 px-4 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex gap-1 rounded-xl bg-white/5 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  tab === t.id
                    ? "bg-white text-[#0a0e17]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {hydrated && me && (
            <div className="flex items-center gap-2 text-sm">
              <span
                className="rounded-full px-3 py-1 font-medium"
                style={{
                  backgroundColor: league ? `${league.accent}22` : "#ffffff14",
                  color: league?.accent ?? "#e7ecf3",
                }}
              >
                {league ? `${league.emoji} ` : "👤 "}
                {me.name}
              </span>
              <button
                onClick={signOut}
                className="text-xs text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
              >
                switch
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={tab === "board" ? "" : "hidden"}>
        <SeasonBoard me={me} onIdentify={identify} onSignOut={signOut} />
      </div>
      <div className={tab === "channel" ? "" : "hidden"}>
        <ChatChannel me={me} onIdentify={identify} onGoToBoard={() => setTab("board")} />
      </div>
      <div className={tab === "rules" ? "" : "hidden"}>{rules}</div>
    </div>
  );
}
