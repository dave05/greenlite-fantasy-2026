"use client";

import { ReactNode, useCallback, useSyncExternalStore } from "react";
import Football from "./Football";
import TabIcon from "./TabIcon";
import Home from "./Home";
import Guillotine from "./Guillotine";
import CountryClub from "./CountryClub";
import Rankings from "./Rankings";
import Fantasy101 from "./Fantasy101";
import DraftBoard from "./DraftBoard";
import News from "./News";
import WaiverWire from "./WaiverWire";
import Gazette from "./Gazette";

const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "guillotine", label: "The Guillotine", icon: "guillotine" },
  { id: "gazette", label: "Gazette", icon: "news" },
  { id: "countryclub", label: "The Country Club", icon: "countryclub" },
  { id: "waiver", label: "Waiver Wire", icon: "waiver" },
  { id: "draft", label: "Draft Board", icon: "draft" },
  { id: "rankings", label: "Rankings", icon: "rankings" },
  { id: "news", label: "News", icon: "news" },
  { id: "howto", label: "Fantasy - 101", icon: "howto" },
  { id: "rules", label: "Rules", icon: "guide" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const isTab = (h: string): h is TabId => TABS.some((t) => t.id === h);

const currentTab = (): TabId => {
  const hash = window.location.hash.slice(1);
  return isTab(hash) ? hash : "home";
};

const subscribeToLocation = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  window.addEventListener("popstate", notify);
  return () => {
    window.removeEventListener("hashchange", notify);
    window.removeEventListener("popstate", notify);
  };
};

export default function AppShell({ rules }: { rules: ReactNode }) {
  // The URL is the source of truth. useSyncExternalStore re-reads the hash
  // after hydration, so direct links never remain stuck on the server's Home
  // fallback and back/forward navigation stays in sync.
  const tab = useSyncExternalStore(subscribeToLocation, currentTab, () => "home");

  const select = useCallback((t: TabId) => {
    const base = window.location.pathname + window.location.search;
    window.history.pushState(null, "", t === "home" ? base : `${base}#${t}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.scrollTo(0, 0);
  }, []);

  return (
    <div>
      {/* Brand + menu (top-left) */}
      <div className="sticky top-0 z-20 -mx-4 mb-10 border-b border-white/[0.07] bg-[#080d0b]/80 px-4 py-3.5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <Football className="w-5 shrink-0 -rotate-12 text-white/85 sm:w-6" />
            <span className="font-display text-sm font-medium uppercase leading-none tracking-[0.08em] sm:text-base">
              GreenLite Gridiron
            </span>
          </div>
          {/* Menu - editorial text tabs with an accent underline */}
          <nav className="flex gap-4 sm:gap-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => select(t.id)}
                aria-label={t.label}
                className={`relative flex items-center gap-1.5 py-1 text-sm transition ${
                  tab === t.id ? "text-white" : "text-white/40 hover:text-white/80"
                }`}
              >
                <TabIcon name={t.icon} className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
                {tab === t.id && (
                  <span
                    className="absolute -bottom-[15px] left-0 right-0 h-px"
                    style={{ backgroundColor: "#34d17a" }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className={tab === "home" ? "" : "hidden"}>
        <Home onNavigate={(t) => select(t)} />
      </div>
      <div className={tab === "guillotine" ? "" : "hidden"}>
        <Guillotine />
      </div>
      <div className={tab === "gazette" ? "" : "hidden"}>
        <Gazette />
      </div>
      <div className={tab === "countryclub" ? "" : "hidden"}>
        <CountryClub />
      </div>
      <div className={tab === "waiver" ? "" : "hidden"}>
        <WaiverWire />
      </div>
      <div className={tab === "draft" ? "" : "hidden"}>
        <DraftBoard />
      </div>
      <div className={tab === "rankings" ? "" : "hidden"}>
        <Rankings />
      </div>
      <div className={tab === "news" ? "" : "hidden"}>
        <News />
      </div>
      <div className={tab === "howto" ? "" : "hidden"}>
        <Fantasy101 />
      </div>
      <div className={tab === "rules" ? "" : "hidden"}>{rules}</div>
    </div>
  );
}
