import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart2, Plus } from "lucide-react";
import SmartFillIndicator from "../components/dashboard/SmartFillIndicator";
import NearbyPrices from "../components/dashboard/NearbyPrices";
import RecentPricesFeed from "../components/dashboard/RecentPricesFeed";
import MyFuelDashboard from "../components/dashboard/MyFuelDashboard";
import { PullToRefresh } from "../components/mobile/PullToRefresh";
import { useTabState } from "../components/mobile/TabStateProvider";
import { RouteAnimation } from "../components/mobile/RouteAnimation";

const fuelTypeLabel = {
  gasoline_95: "Bensin 95",
  gasoline_98: "Bensin 98",
  diesel: "Diesel",
};

export default function Dashboard() {
  const [prices, setPrices] = useState([]);
  const [ssbData, setSsbData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFuel, setSelectedFuel] = useState("gasoline_95");
  const { scrollRef, restoreScroll } = useTabState("Dashboard");

  useEffect(() => {
    loadData();
    restoreScroll();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [priceData, ssbDataResp] = await Promise.all([
        base44.entities.FuelPrice.list("-fetchedAt", 1000),
        base44.entities.SSBData.list("-created_date", 200)
      ]);
      setPrices(priceData);
      setSsbData(ssbDataResp);
    } catch (err) {
      console.error("[Dashboard] loadData", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouteAnimation pageName="Dashboard">
      <PullToRefresh onRefresh={loadData} isLoading={loading}>
        <div ref={scrollRef} className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
        {/* Primary CTA */}
        <div className="mb-5">
          <Link to={createPageUrl("LogPrice")} className="block sm:inline-block">
            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 gap-2 h-12 text-base px-6">
              <Plus size={20} /> Logg pris
            </Button>
          </Link>
        </div>

        {/* Fuel type selector */}
        <div className="flex gap-2 flex-wrap mb-6">
          {Object.entries(fuelTypeLabel).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedFuel(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedFuel === key
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Smart Fill Indicator */}
        <div className="mb-6">
          <SmartFillIndicator ssbData={ssbData} observedPrices={prices} selectedFuel={selectedFuel} />
        </div>

        {/* Billigste nær deg */}
        <div className="mb-6">
          <NearbyPrices selectedFuel={selectedFuel} />
        </div>

        {/* Siste rapporterte priser */}
        <div className="mb-6">
          <RecentPricesFeed />
        </div>

        {/* Min drivstoff — personalisert seksjon */}
        <MyFuelDashboard />

        {/* Markedsstatistikk */}
        <div className="mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LiveMarketStats observedPrices={prices} selectedFuel={selectedFuel} />
            <PriceChangeIndicator observedPrices={prices} selectedFuel={selectedFuel} />
          </div>
        </div>

        {/* SSB historisk referanse */}
        <div className="mb-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 flex items-center justify-between">
                <span>Offisiell referanse (SSB)</span>
                <Link to={createPageUrl("Statistics")} className="text-xs text-blue-600 hover:text-blue-700 font-normal">
                  Se full analyse →
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ maxHeight: "200px", overflow: "hidden" }}>
                <HistoricalSSBTrend ssbData={ssbData} selectedFuel={selectedFuel} loading={loading} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        </div>
      </PullToRefresh>
    </RouteAnimation>
  );
}