import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart2, Plus, Home, Settings } from "lucide-react";
import { MobileHeader } from "./components/mobile/MobileHeader";
import { RouteAnimation } from "./components/mobile/RouteAnimation";
import { TankRadarLogo } from "./components/TankRadarLogo";

const navLinks = [
  { label: "Oversikt", page: "Dashboard", icon: Home },
  { label: "Statistikk", page: "Statistics", icon: BarChart2 },
  { label: "Logg pris", page: "LogPrice", icon: Plus },
];

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [lastClickedTab, setLastClickedTab] = useState(null);
  const mainPages = ["Dashboard", "Statistics", "LogPrice"];
  const isMainPage = mainPages.includes(currentPageName);

  const handleTabClick = (page) => {
    if (currentPageName === page && lastClickedTab === page) {
      // Double-tap same tab: reset to root route
      navigate(createPageUrl(page), { replace: true });
      setLastClickedTab(null);
    } else {
      setLastClickedTab(page);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile Header */}
      <MobileHeader currentPageName={currentPageName} showBack={!isMainPage} />

      {/* Top nav - Desktop only */}
      <nav className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-30 pt-safe">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 font-bold">
            <TankRadarLogo size={32} />
            <span className="text-slate-900">TankRadar</span>
          </Link>
          <div className="flex gap-1">
            {navLinks.map(({ label, page, icon: Icon }) => (
              <Link
                key={page}
                to={createPageUrl(page)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentPageName === page
                    ? "bg-green-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={15} />
                <span>{label}</span>
              </Link>
            ))}
            <Link
              to={createPageUrl("Settings")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentPageName === "Settings"
                  ? "bg-green-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Settings size={15} />
              <span>Innstillinger</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Page content with route animation */}
      <main className="flex-1 pb-20 md:pb-0">
        <RouteAnimation pageName={currentPageName}>
          {children}
        </RouteAnimation>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe">
        <div className="flex justify-around">
          {navLinks.map(({ label, page, icon: Icon }) => (
            <button
              key={page}
              onClick={() => handleTabClick(page)}
              className={`flex flex-col items-center justify-center py-3 flex-1 text-xs transition-colors ${
                currentPageName === page
                  ? "bg-green-50 text-green-600"
                  : "text-slate-600"
              }`}
            >
              <Icon size={20} />
              <span className="mt-0.5">{label}</span>
            </button>
          ))}
          <button
            onClick={() => handleTabClick("Settings")}
            className={`flex flex-col items-center justify-center py-3 flex-1 text-xs transition-colors ${
              currentPageName === "Settings"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600"
            }`}
          >
            <Settings size={20} />
            <span className="mt-0.5">Innstillinger</span>
          </button>
        </div>
      </nav>
    </div>
  );
}