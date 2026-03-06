import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fuel, Plus } from "lucide-react";
import { format, subDays } from "date-fns";
import { nb } from "date-fns/locale";
import NationalAverageSection from "../components/dashboard/NationalAverageSection.jsx";
import StationPricesSection from "../components/dashboard/StationPricesSection.jsx";
import DataSourcesSection from "../components/dashboard/DataSourcesSection.jsx";
import TrendChart from "../components/dashboard/TrendChart.jsx";
import GooglePlacesHistorySection from "../components/dashboard/GooglePlacesHistorySection.jsx";
import SmartFillIndicator from "../components/dashboard/SmartFillIndicator";
import LiveMarketStats from "../components/dashboard/LiveMarketStats";
import PriceChangeIndicator from "../components/dashboard/PriceChangeIndicator";
import RegionalStats from "../components/dashboard/RegionalStats";
import PriceDistribution from "../components/dashboard/PriceDistribution";
import HistoricalSSBTrend from "../components/dashboard/HistoricalSSBTrend";

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

  useEffect(() => {
    loadData();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <Fuel className="text-blue-600" size={32} />
              Drivstoffpris Norge
            </h1>
            <p className="text-slate-500 mt-1">Community-basert prisdeling</p>
          </div>
          <Link to={createPageUrl("LogPrice")}>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus size={18} /> Logg pris
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

        {/* SECTION 1: Smart Fill Indicator */}
        <div className="mb-8">
          <SmartFillIndicator ssbData={ssbData} observedPrices={prices} selectedFuel={selectedFuel} />
        </div>

        {/* SECTION 2: Live Market Stats */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Live markedspriser nå</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LiveMarketStats observedPrices={prices} selectedFuel={selectedFuel} />
            <PriceChangeIndicator observedPrices={prices} selectedFuel={selectedFuel} />
          </div>
        </div>

        {/* SECTION 3: Regional Statistics */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Regional statistikk</h2>
          <RegionalStats observedPrices={prices} ssbData={ssbData} selectedFuel={selectedFuel} />
        </div>

        {/* SECTION 4: Price Distribution */}
        <div className="mb-8">
          <PriceDistribution observedPrices={prices} selectedFuel={selectedFuel} />
        </div>

        {/* SECTION 5: Historical SSB Trend */}
        <div className="mb-8">
          <HistoricalSSBTrend ssbData={ssbData} selectedFuel={selectedFuel} loading={loading} />
        </div>

        {/* SECTION 6: GooglePlaces Historical Data Section */}
        <div className="mb-8">
          <GooglePlacesHistorySection prices={prices} />
        </div>

        {/* Data Sources */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Datakilder</h2>
          <DataSourcesSection />
        </div>
      </div>
    </div>
  );
}