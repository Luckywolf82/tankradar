import React, { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import RadarCard from "../components/dashboard/RadarCard";
import SubmitPriceCard from "../components/dashboard/SubmitPriceCard";
import FirstTimeOverlay from "../components/dashboard/FirstTimeOverlay";
import ActiveAlertsPreview from "../components/dashboard/ActiveAlertsPreview";
import PumpModeCard from "../components/dashboard/PumpModeCard";
import ContributionImpactCard from "../components/dashboard/ContributionImpactCard";
import RouteSavingsCard from "../components/dashboard/RouteSavingsCard";
import NationalFuelBarometer from "../components/dashboard/NationalFuelBarometer";
import PageContainer from "../components/layout/PageContainer";
import DashboardGrid from "../components/layout/DashboardGrid";
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
      <FirstTimeOverlay />
      <PullToRefresh onRefresh={loadData} isLoading={loading}>
        <div ref={scrollRef} className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-4 md:py-8">
          <PageContainer>
            <div className="space-y-4">
              {/* Quick Price Submit — moved to position 1 (highest priority) */}
              {!pumpModeActive && (
                <>
                  <SubmitPriceCard />

                  {/* Primary CTA */}
                  <Link to={createPageUrl("LogPrice")} className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2 h-10 text-sm">
                      <Plus size={16} /> Logg pris
                    </Button>
                  </Link>
                </>
              )}

              {/* Pump Mode — activates when user is ≤150m from a station (position 2) */}
              <PumpModeCard onActivate={setPumpModeActive} />

              {/* National Fuel Barometer — price context vs. 30-day historical */}
              <NationalFuelBarometer />

              {/* Contribution Impact — user's reporting stats */}
              <ContributionImpactCard />

              {/* Route Savings — cheapest alternative station */}
              <RouteSavingsCard selectedFuel="diesel" />

              {/* Dashboard Grid — organized layout */}
              <DashboardGrid columns={1}>
                <RadarCard selectedFuel="diesel" />
                <ActiveAlertsPreview />
              </DashboardGrid>
            </div>
          </PageContainer>
        </div>
      </PullToRefresh>
    </RouteAnimation>
  );
}