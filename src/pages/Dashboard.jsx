import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingDown, TrendingUp, Fuel, Users, Plus, BarChart2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { nb } from "date-fns/locale";
import DayOfWeekChart from "../components/dashboard/DayOfWeekChart.jsx";
import RecentPrices from "../components/dashboard/RecentPrices.jsx";
import TrendChart from "../components/dashboard/TrendChart.jsx";

const fuelTypeLabel = {
  bensin_95: "Bensin 95",
  bensin_98: "Bensin 98",
  diesel: "Diesel",
  diesel_premium: "Diesel Premium",
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
    const data = await base44.entities.FuelPrice.list("-date_observed", 500);
    setPrices(data);
    setLoading(false);
  };

  const filtered = prices.filter(p => p.fuel_type === selectedFuel);
  const last7days = filtered.filter(p => new Date(p.date_observed) >= subDays(new Date(), 7));
  const last30days = filtered.filter(p => new Date(p.date_observed) >= subDays(new Date(), 30));

  const avgLast7 = last7days.length ? (last7days.reduce((s, p) => s + p.price, 0) / last7days.length).toFixed(2) : null;
  const avgLast30 = last30days.length ? (last30days.reduce((s, p) => s + p.price, 0) / last30days.length).toFixed(2) : null;

  const lowestToday = filtered
    .filter(p => p.date_observed === format(new Date(), "yyyy-MM-dd"))
    .sort((a, b) => a.price - b.price)[0];

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

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500 font-medium">Snitt siste 7 dager</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">
                {avgLast7 ? `${avgLast7} kr` : "–"}
              </div>
              <p className="text-xs text-slate-400 mt-1">{last7days.length} registreringer</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500 font-medium">Snitt siste 30 dager</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">
                {avgLast30 ? `${avgLast30} kr` : "–"}
              </div>
              <p className="text-xs text-slate-400 mt-1">{last30days.length} registreringer</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500 font-medium">Lavest i dag</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {lowestToday ? `${lowestToday.price.toFixed(2)} kr` : "–"}
              </div>
              <p className="text-xs text-slate-400 mt-1">{lowestToday ? `${lowestToday.station_chain}, ${lowestToday.city}` : "Ingen data ennå"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TrendChart prices={filtered} fuelLabel={fuelTypeLabel[selectedFuel]} />
          <DayOfWeekChart prices={filtered} />
        </div>

        {/* Recent prices */}
        <RecentPrices prices={filtered.slice(0, 20)} loading={loading} />
      </div>
    </div>
  );
}