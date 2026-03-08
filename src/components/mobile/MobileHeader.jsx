import React from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * MobileHeader Component
 * Mobile-only header that shows:
 * - Logo + title on root pages (Dashboard, Statistics, LogPrice)
 * - Back button on child/detail pages
 * 
 * Desktop: hidden (uses existing top nav)
 */
export function MobileHeader({ currentPageName, showBack = false }) {
  const navigate = useNavigate();
  const mainPages = ["Dashboard", "Statistics", "LogPrice"];
  const isMainPage = mainPages.includes(currentPageName);

  const handleBack = () => {
    // Check if there's a navigation history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to Dashboard if no history (direct entry or webview)
      navigate(createPageUrl("Dashboard"));
    }
  };

  return (
    <div className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 pt-safe">
      <div className="px-4 h-14 flex items-center justify-between">
        {showBack && !isMainPage ? (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={handleBack}
            >
              <ArrowLeft size={20} />
            </Button>
            <div />
          </>
        ) : (
          <>
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69aab8c78a62757f8f707126/0dd7fb1be_file_000000002b94720ab4a84cc00f949b51.png" alt="TankRadar" className="h-16" />
            </Link>
            <div />
          </>
        )}
      </div>
    </div>
  );
}