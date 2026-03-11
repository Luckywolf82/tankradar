import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import PriceDistribution from "../components/dashboard/PriceDistribution";
import RegionalStats from "../components/dashboard/RegionalStats";
import HistoricalSSBTrend from "../components/dashboard/HistoricalSSBTrend";
import { PullToRefresh } from "../components/mobile/PullToRefresh";
import { useTabState } from "../components/mobile/TabStateProvider";
import { RouteAnimation } from "../components/mobile/RouteAnimation";

const fuelTypeLabel = {
  gasoline_95: "Bensin 95",
  gasoline_98: "Bensin 98",
  diesel: "Diesel",
};

export default function Statistics() {
  const [prices, setPrices] = useState([]);
  const [ssbData, setSsbData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFuel, setSelectedFuel] = useState("gasoline_95");
  const { scrollRef, restoreScroll } = useTabState("Statistics");

  useEffect(() => {
    loadData();
    restoreScroll();
  }, []);

  const [stations, setStations] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [priceData, ssbDataResp, stationData] = await Promise.all([
        base44.entities.FuelPrice.list("-fetchedAt", 1000),
        base44.entities.SSBData.list("-created_date", 200),
        base44.entities.Station.list(null, 2000)
      ]);
      setPrices(priceData);
      setSsbData(ssbDataResp);
      setStations(stationData);
    } catch (err) {
      console.error("[Statistics] loadData", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouteAnimation pageName="Statistics">
      <PullToRefresh onRefresh={loadData} isLoading={loading}>
        <div ref={scrollRef} className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Statistikk</h1>
          <p className="text-sm text-slate-500 mt-0.5">Prisanalyse og historiske trender</p>
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

        {/* SECTION 1: Historical Trend */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Historisk trend (SSB)</h2>
          <HistoricalSSBTrend ssbData={ssbData} selectedFuel={selectedFuel} loading={loading} />
        </div>

        {/* SECTION 2: Price Distribution */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Prisfordeling</h2>
          <PriceDistribution observedPrices={prices} selectedFuel={selectedFuel} />
        </div>

        {/* SECTION 3: Regional Analysis */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Regional analyse</h2>
          <RegionalStats observedPrices={prices} stations={stations} ssbData={ssbData} selectedFuel={selectedFuel} />
        </div>

        {/* Data Quality Info */}
        <div className="mt-12 mb-8">
          <Card className="shadow-sm bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base text-blue-900">Om dataene</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800 space-y-2">
              <p><strong>SSB-data:</strong> Statistisk Sentralbyrå – offisiell historisk referanse</p>
              <p><strong>Live observed:</strong> Google Places – nåtidsdata (realistic_price only)</p>
              <p><strong>Regional:</strong> Basert på observerte priser fra live kilder</p>
              <p><strong>Sample size:</strong> Vises per lokasjon – lavt grunnlag merkes eksplisitt</p>
            </CardContent>
          </Card>
        </div>
      </div>
        </div>
      </PullToRefresh>
    </RouteAnimation>
  );
}