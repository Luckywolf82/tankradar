import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, TrendingUp, AlertCircle } from "lucide-react";
import SSBChart from "../components/statistics/SSBChart.jsx";
import GooglePlacesObservedStats from "../components/statistics/GooglePlacesObservedStats.jsx";
import VerifiedStationStats from "../components/statistics/VerifiedStationStats.jsx";

export default function Statistics() {
  const [ssbData, setSsbData] = useState([]);
  const [fuelPrices, setFuelPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingSSB, setFetchingSSB] = useState(false);
  const [ssbMsg, setSsbMsg] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [ssb, prices] = await Promise.all([
      base44.entities.SSBData.list("-created_date", 200),
      base44.entities.FuelPrice.list("-fetchedAt", 1000),
    ]);
    setSsbData(ssb);
    setFuelPrices(prices);
    setLoading(false);
  };

  const handleFetchSSB = async () => {
    setFetchingSSB(true);
    setSsbMsg(null);
    const res = await base44.functions.invoke("fetchSSBData", {});
    if (res.data?.success) {
      setSsbMsg(`Hentet ${res.data.fetched} datapunkter fra SSB. ${res.data.new_records} nye lagret.`);
      await loadData();
    } else {
      setSsbMsg("Feil ved henting av SSB-data: " + (res.data?.error || "ukjent feil"));
    }
    setFetchingSSB(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Link to={createPageUrl("Dashboard")} className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 mb-6 text-sm">
          <ArrowLeft size={16} /> Tilbake til oversikt
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Statistikk</h1>
            <p className="text-slate-500 mt-1">Nasjonal gjennomsnitt, observerte markedspriser og stasjonsobservasjoner</p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleFetchSSB}
            disabled={fetchingSSB}
          >
            <Database size={16} />
            {fetchingSSB ? "Henter..." : "Oppdater SSB"}
          </Button>
        </div>

        {ssbMsg && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            {ssbMsg}
          </div>
        )}

        <div className="space-y-8">
          {/* A. National Statistics from GlobalPetrolPrices (via SSB) */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-blue-600" />
              <h2 className="text-xl font-semibold text-slate-800">A. Nasjonal gjennomsnittspris</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">Offisielle gjennomsnittspriser fra Statistisk Sentralbyrå</p>
            <SSBChart ssbData={ssbData} loading={loading} />
          </div>

          {/* B. Observed Market Statistics from GooglePlaces */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={20} className="text-amber-600" />
              <h2 className="text-xl font-semibold text-slate-800">B. Observerte markedspriser</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">Prisdata hentet fra Google Places – delvis dekning, gjeldende stasjonspriser</p>
            <GooglePlacesObservedStats fuelPrices={fuelPrices} loading={loading} />
          </div>

          {/* C. Verified Station Observations */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-green-600" />
              <h2 className="text-xl font-semibold text-slate-800">C. Verifiserte stasjonsobservasjoner</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">High-confidence stasjonsmatcher fra pålidelige kilder</p>
            <VerifiedStationStats fuelPrices={fuelPrices} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}