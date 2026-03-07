import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart2, Plus, Home, Settings, User, ClipboardList, ShieldCheck } from "lucide-react";
import { MobileHeader } from "./components/mobile/MobileHeader";
import { RouteAnimation } from "./components/mobile/RouteAnimation";
import { useCurrentUser } from "./components/auth/useCurrentUser";
import { base44 } from "@/api/base44Client";

const baseNavLinks = [
  { label: "Oversikt", page: "Dashboard", icon: Home },
  { label: "Statistikk", page: "Statistics", icon: BarChart2 },
  { label: "Logg pris", page: "LogPrice", icon: Plus },
];

export default function Layout({ children, currentPageName }) {
  const { user, role } = useCurrentUser();

  const mainPages = ["Dashboard", "Statistics", "LogPrice"];
  const isMainPage = mainPages.includes(currentPageName);

  // Build role-specific extra nav items
  const extraNavLinks = [];
  if (role === "user") {
    extraNavLinks.push({ label: "Profil", page: "Profile", icon: User });
  } else if (role === "curator") {
    extraNavLinks.push({ label: "Review", page: "ReviewQueue", icon: ClipboardList });
    extraNavLinks.push({ label: "Profil", page: "Profile", icon: User });
  } else if (role === "admin") {
    extraNavLinks.push({ label: "Admin", page: "SuperAdmin", icon: ShieldCheck });
  }

  const allNavLinks = [...baseNavLinks, ...extraNavLinks];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile Header */}
      <MobileHeader currentPageName={currentPageName} showBack={!isMainPage} />

      {/* Top nav - Desktop only */}
      <nav className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-30 pt-safe">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 font-bold">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69aab8c78a62757f8f707126/0dd7fb1be_file_000000002b94720ab4a84cc00f949b51.png"
              alt="TankRadar"
              className="h-24"
            />
          </Link>
          <div className="flex gap-1 items-center">
            {allNavLinks.map(({ label, page, icon: Icon }) => (
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
            {/* Login/logout */}
            {!user ? (
              <button
                onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Logg inn
              </button>
            ) : (
              <button
                onClick={() => base44.auth.logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Logg ut
              </button>
            )}
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
          {allNavLinks.map(({ label, page, icon: Icon }) => (
            <Link
              key={page}
              to={createPageUrl(page)}
              className={`flex flex-col items-center justify-center py-3 flex-1 text-xs transition-colors ${
                currentPageName === page
                  ? "bg-green-50 text-green-600"
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
                ? "bg-green-50 text-green-600"
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