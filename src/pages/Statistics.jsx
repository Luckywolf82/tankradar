import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Database } from "lucide-react";
import SSBChart from "../components/statistics/SSBChart.jsx";
import PriceByRegion from "../components/statistics/PriceByRegion.jsx";
import PriceByChain from "../components/statistics/PriceByChain.jsx";

export default function Statistics() {
  const [ssbData, setSsbData] = useState([]);
  const [communityData, setCommunityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingSSB, setFetchingSSB] = useState(false);
  const [ssbMsg, setSsbMsg] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [ssb, community] = await Promise.all([
      base44.entities.SSBData.list("-year,-month", 200),
      base44.entities.FuelPrice.list("-date_observed", 500),
    ]);
    setSsbData(ssb);
    setCommunityData(community);
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
            <p className="text-slate-500 mt-1">Historiske priser fra SSB og community</p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleFetchSSB}
            disabled={fetchingSSB}
          >
            <Database size={16} />
            {fetchingSSB ? "Henter SSB-data..." : "Oppdater SSB-data"}
          </Button>
        </div>

        {ssbMsg && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            {ssbMsg}
          </div>
        )}

        <div className="space-y-8">
          <SSBChart ssbData={ssbData} loading={loading} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PriceByRegion data={communityData} />
            <PriceByChain data={communityData} />
          </div>
        </div>
      </div>
    </div>
  );
}