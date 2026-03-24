import React, { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Plus, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import RadarCard from "../components/dashboard/RadarCard";
import SubmitPriceCard from "../components/dashboard/SubmitPriceCard";
import FirstTimeOverlay from "../components/dashboard/FirstTimeOverlay";
import ActiveAlertsPreview from "../components/dashboard/ActiveAlertsPreview";
import PumpModeCard from "../components/dashboard/PumpModeCard";
import ContributionImpactCard from "../components/dashboard/ContributionImpactCard";
import RouteSavingsCard from "../components/dashboard/RouteSavingsCard";
import SavingsSummaryCard from "../components/dashboard/SavingsSummaryCard";
import PageContainer from "../components/layout/PageContainer";
import DashboardGrid from "../components/layout/DashboardGrid";
import { PullToRefresh } from "../components/mobile/PullToRefresh";
import { useTabState } from "../components/mobile/TabStateProvider";
import { RouteAnimation } from "../components/mobile/RouteAnimation";
import { usePumpInsight } from "@/hooks/usePumpInsight";

const FUEL_OPTIONS = [
  { value: "diesel", label: "Diesel" },
  { value: "gasoline_95", label: "Bensin 95" },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [pumpModeActive, setPumpModeActive] = useState(false);
  const [pumpStationId, setPumpStationId] = useState(null);
  const [selectedFuel, setSelectedFuel] = useState("diesel");

  // Pump insight should own current-market logic via usePumpInsight.
  const pumpInsight = usePumpInsight(pumpStationId, selectedFuel);

  const { scrollRef, restoreScroll } = useTabState("Dashboard");

  useEffect(() => {
    restoreScroll();
  }, [restoreScroll]);

  const loadData = async () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <RouteAnimation pageName="Dashboard">
      <FirstTimeOverlay />

      <PullToRefresh onRefresh={loadData} isLoading={loading}>
        <div
          ref={scrollRef}
          className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-4 md:py-8"
        >
          <PageContainer>
            <div className="space-y-4">
              {!pumpModeActive && (
                <>
                  <SubmitPriceCard />

                  <Link to={createPageUrl("LogPrice")} className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2 h-10 text-sm">
                      <Plus size={16} />
                      Logg pris
                    </Button>
                  </Link>
                </>
              )}

              <PumpModeCard
                onActivate={setPumpModeActive}
                onStationDetected={setPumpStationId}
                pumpInsight={pumpInsight}
              />

              <ContributionImpactCard />

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

              {/*
                SavingsSummaryCard should stay as area-context only.
                When pumpModeActive is true, PumpModeCard is the single savings authority.
              */}
              <SavingsSummaryCard
                selectedFuel={selectedFuel}
                pumpModeActive={pumpModeActive}
              />

              <RouteSavingsCard selectedFuel={selectedFuel} />

              <Link to={createPageUrl("RoutePlanner")} className="block">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <Navigation size={15} className="text-blue-500 shrink-0" />
                  <span className="text-sm text-slate-700 font-medium">Beste drivstoff langs ruta</span>
                  <span className="ml-auto text-xs text-slate-400">→</span>
                </div>
              </Link>

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