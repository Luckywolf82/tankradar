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
import PageContainer from "../components/layout/PageContainer";
import DashboardGrid from "../components/layout/DashboardGrid";
import { PullToRefresh } from "../components/mobile/PullToRefresh";
import { useTabState } from "../components/mobile/TabStateProvider";
import { RouteAnimation } from "../components/mobile/RouteAnimation";

const FUEL_OPTIONS = [
  { value: "diesel", label: "Diesel" },
  { value: "gasoline_95", label: "Bensin 95" },
  { value: "gasoline_98", label: "Bensin 98" },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [pumpModeActive, setPumpModeActive] = useState(false);
  const [pumpStationId, setPumpStationId] = useState(null);
  const [selectedFuel, setSelectedFuel] = useState("diesel");

  const pumpInsight = usePumpInsight(pumpStationId, selectedFuel);
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
              <PumpModeCard
                onActivate={setPumpModeActive}
                onStationDetected={setPumpStationId}
                pumpInsight={pumpInsight}
              />

              {/* Contribution Impact — user's reporting stats */}
              <ContributionImpactCard />

              {/* Fuel selector — controls nearby radar and route savings */}
              <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                {FUEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedFuel(opt.value)}
                    className={`flex-1 py-2 px-1 text-xs font-medium transition-colors ${
                      selectedFuel === opt.value
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Route Savings — cheapest alternative station */}
              <RouteSavingsCard selectedFuel={selectedFuel} />

              {/* Dashboard Grid — organized layout */}
              <DashboardGrid columns={1}>
                <RadarCard selectedFuel={selectedFuel} />
                <ActiveAlertsPreview />
              </DashboardGrid>
            </div>
          </PageContainer>
        </div>
      </PullToRefresh>
    </RouteAnimation>
  );
}