import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Fuel, BarChart2, Plus, Home, Settings } from "lucide-react";

const navLinks = [
  { label: "Oversikt", page: "Dashboard", icon: Home },
  { label: "Statistikk", page: "Statistics", icon: BarChart2 },
  { label: "Logg pris", page: "LogPrice", icon: Plus },
];

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top nav - Desktop only */}
      <nav className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-30 pt-safe">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 font-bold text-blue-600">
            <Fuel size={22} />
            <span>Drivstoffpris.no</span>
          </Link>
          <div className="flex gap-1">
            {navLinks.map(({ label, page, icon: Icon }) => (
              <Link
                key={page}
                to={createPageUrl(page)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentPageName === page
                    ? "bg-blue-600 text-white"
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
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Settings size={15} />
              <span>Innstillinger</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Bottom Navigation - Mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe">
        <div className="flex justify-around">
          {navLinks.map(({ label, page, icon: Icon }) => (
            <Link
              key={page}
              to={createPageUrl(page)}
              className={`flex flex-col items-center justify-center py-3 flex-1 text-xs transition-colors ${
                currentPageName === page
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600"
              }`}
            >
              <Icon size={20} />
              <span className="mt-0.5">{label}</span>
            </Link>
          ))}
          <Link
            to={createPageUrl("Settings")}
            className={`flex flex-col items-center justify-center py-3 flex-1 text-xs transition-colors ${
              currentPageName === "Settings"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600"
            }`}
          >
            <Settings size={20} />
            <span className="mt-0.5">Innstillinger</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}