"use client";

import { ReactNode, useState } from "react";
import Football from "./Football";
import TabIcon from "./TabIcon";
import Home from "./Home";
import Guillotine from "./Guillotine";
import CountryClub from "./CountryClub";
import Rankings from "./Rankings";

const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "guillotine", label: "The Guillotine", icon: "guillotine" },
  { id: "countryclub", label: "The Country Club", icon: "countryclub" },
  { id: "rankings", label: "Rankings", icon: "rankings" },
  { id: "rules", label: "Rules", icon: "guide" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AppShell({ rules }: { rules: ReactNode }) {
  const [tab, setTab] = useState<TabId>("home");

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
                onClick={() => setTab(t.id)}
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
        <Home onNavigate={(t) => setTab(t)} />
      </div>
      <div className={tab === "guillotine" ? "" : "hidden"}>
        <Guillotine />
      </div>
      <div className={tab === "countryclub" ? "" : "hidden"}>
        <CountryClub />
      </div>
      <div className={tab === "rankings" ? "" : "hidden"}>
        <Rankings />
      </div>
      <div className={tab === "rules" ? "" : "hidden"}>{rules}</div>
    </div>
  );
}
