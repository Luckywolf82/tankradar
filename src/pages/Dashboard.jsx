import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fuel, Plus } from "lucide-react";
import SmartFillIndicator from "../components/dashboard/SmartFillIndicator";
import LiveMarketStats from "../components/dashboard/LiveMarketStats";
import PriceChangeIndicator from "../components/dashboard/PriceChangeIndicator";
import HistoricalSSBTrend from "../components/dashboard/HistoricalSSBTrend";
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
    const [priceData, ssbDataResp] = await Promise.all([
      base44.entities.FuelPrice.list("-fetchedAt", 1000),
      base44.entities.SSBData.list("-created_date", 200)
    ]);
    setPrices(priceData);
    setSsbData(ssbDataResp);
    setLoading(false);
  };

  return (
    <RouteAnimation pageName="Dashboard">
      <PullToRefresh onRefresh={loadData} isLoading={loading}>
        <div ref={scrollRef} className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex gap-2">
            <Link to={createPageUrl("LogPrice")}>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Plus size={18} /> Logg pris
              </Button>
            </Link>
            <Link to={createPageUrl("Statistics")}>
              <Button variant="outline" className="gap-2">
                Detaljert analyse
              </Button>
            </Link>
          </div>
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

        {/* SECTION 1: Smart Fill Indicator - Rask beslutning */}
        <div className="mb-8">
          <SmartFillIndicator ssbData={ssbData} observedPrices={prices} selectedFuel={selectedFuel} />
        </div>

        {/* SECTION 2: Live Market Stats - Rask oversikt */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Live markedspriser nå</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LiveMarketStats observedPrices={prices} selectedFuel={selectedFuel} />
            <PriceChangeIndicator observedPrices={prices} selectedFuel={selectedFuel} />
          </div>
        </div>

        {/* SECTION 3: Mini SSB trend - liten historisk referanse */}
        <div className="mb-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Offisiell referanse (SSB)</span>
                <Link to={createPageUrl("Statistics")}>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                    Se full analyse →
                  </Button>
                </Link>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-2">Statistisk Sentralbyrå – historisk månedsgjennomsnitt</p>
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