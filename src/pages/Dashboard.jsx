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

const fuelTypeLabel = {
  gasoline_95: "Bensin 95",
  gasoline_98: "Bensin 98",
  diesel: "Diesel",
};

export default function Dashboard() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFuel, setSelectedFuel] = useState("bensin_95");

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    setLoading(true);
    const data = await base44.entities.FuelPrice.list("-fetchedAt", 500);
    setPrices(data);
    setLoading(false);
  };

  const filtered = prices.filter(p => p.fuelType === selectedFuel && p.priceType === "national_average");
  const stationFiltered = prices.filter(p => p.priceType === "station_level");
  const last7days = filtered.filter(p => new Date(p.fetchedAt) >= subDays(new Date(), 7));
  const last30days = filtered.filter(p => new Date(p.fetchedAt) >= subDays(new Date(), 30));

  const avgLast7 = last7days.length ? (last7days.reduce((s, p) => s + p.priceNok, 0) / last7days.length).toFixed(2) : null;
  const avgLast30 = last30days.length ? (last30days.reduce((s, p) => s + p.priceNok, 0) / last30days.length).toFixed(2) : null;

  const lowestToday = stationFiltered
    .filter(p => p.fetchedAt && p.fetchedAt.split("T")[0] === format(new Date(), "yyyy-MM-dd"))
    .sort((a, b) => a.priceNok - b.priceNok)[0];

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

        {/* National Average Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Nasjonalt snitt</h2>
          <NationalAverageSection prices={prices} />
        </div>

        {/* National Trend Chart */}
        <div className="mb-8">
          <TrendChart prices={filtered} fuelLabel={fuelTypeLabel[selectedFuel]} />
        </div>

        {/* GooglePlaces Historical Data Section */}
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