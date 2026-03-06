import React from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Fuel, ArrowLeft } from "lucide-react";
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

  return (
    <div className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 pt-safe">
      <div className="px-4 h-14 flex items-center justify-between">
        {showBack && !isMainPage ? (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={20} />
            </Button>
            <div />
          </>
        ) : (
          <>
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 font-bold text-blue-600">
              <Fuel size={20} />
              <span className="text-sm">Drivstoffpris.no</span>
            </Link>
            <div />
          </>
        )}
      </div>
    </div>
  );
}