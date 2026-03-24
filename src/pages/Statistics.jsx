import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

import NationalFuelBarometer from "../components/dashboard/NationalFuelBarometer";
import PriceDistribution from "../components/dashboard/PriceDistribution";
import RegionalStats from "../components/dashboard/RegionalStats";
import HistoricalSSBTrend from "../components/dashboard/HistoricalSSBTrend";
import { PullToRefresh } from "../components/mobile/PullToRefresh";
import { useTabState } from "../components/mobile/TabStateProvider";
import { RouteAnimation } from "../components/mobile/RouteAnimation";

const fuelTypeLabel = {
  gasoline_95: "Bensin 95",
  diesel: "Diesel",
};

export default function Statistics() {
  const [prices, setPrices] = useState([]);
  const [ssbData, setSsbData] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFuel, setSelectedFuel] = useState("diesel");
  const { scrollRef, restoreScroll } = useTabState("Statistics");

  useEffect(() => {
    loadData();
    restoreScroll();
  }, []);

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
        <div ref={scrollRef} className="min-h-screen bg-slate-50 p-4 md:p-8">
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

            <div className="mb-6">
              <NationalFuelBarometer selectedFuel={selectedFuel} />
            </div>

            <div className="mb-6">
              <HistoricalSSBTrend ssbData={ssbData} selectedFuel={selectedFuel} loading={loading} />
            </div>

            <div className="mb-6">
              <PriceDistribution observedPrices={prices} selectedFuel={selectedFuel} />
            </div>

            <div className="mb-6">
              <RegionalStats observedPrices={prices} stations={stations} ssbData={ssbData} selectedFuel={selectedFuel} />
            </div>

            {/* Data footnote — lighter than a full card */}
            <p className="text-xs text-slate-400 text-center pb-8 mt-4">
              SSB: offisiell historisk referanse · Google Places: observerte stasjonspriser · Lavt grunnlag merkes eksplisitt
            </p>

          </div>
        </div>
      </PullToRefresh>
    </RouteAnimation>
  );
}