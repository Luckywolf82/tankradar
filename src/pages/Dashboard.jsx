import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import RadarCard from "../components/dashboard/RadarCard";
import SubmitPriceCard from "../components/dashboard/SubmitPriceCard";
import ActiveAlertsPreview from "../components/dashboard/ActiveAlertsPreview";
import PumpModeCard from "../components/dashboard/PumpModeCard";
import { PullToRefresh } from "../components/mobile/PullToRefresh";
import { useTabState } from "../components/mobile/TabStateProvider";
import { RouteAnimation } from "../components/mobile/RouteAnimation";

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [pumpModeActive, setPumpModeActive] = useState(false);
  const { scrollRef, restoreScroll } = useTabState("Dashboard");

  useEffect(() => {
    restoreScroll();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Refetch components via their own useEffect
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <RouteAnimation pageName="Dashboard">
      <PullToRefresh onRefresh={loadData} isLoading={loading}>
        <div ref={scrollRef} className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Pump Mode — activates when user is ≤150m from a station */}
            <PumpModeCard onActivate={setPumpModeActive} />

            {/* Quick Price Submit — always shown */}
            {!pumpModeActive && (
              <>
                <SubmitPriceCard />

                {/* Primary CTA */}
                <div>
                  <Link to={createPageUrl("LogPrice")} className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2 h-10 text-sm">
                      <Plus size={16} /> Logg pris
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {/* Nearby Cheap Stations */}
            <RadarCard selectedFuel="diesel" />

            {/* Active Alerts Overview */}
            <ActiveAlertsPreview />
          </div>
        </div>
      </PullToRefresh>
    </RouteAnimation>
  );
}