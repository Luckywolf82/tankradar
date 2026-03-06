import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";
import MarketCoverageReport from "../components/analytics/MarketCoverageReport";

export default function CoverageReport() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-blue-600" size={32} />
              Market Data Coverage Report
            </h1>
            <p className="text-slate-500 mt-1">Diagnostisk rapport over all observed market data</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-sm text-blue-900">
          <p className="font-semibold mb-2">📊 Hensikt:</p>
          <p>
            Denne rapporten viser oversikt over all eksisterende observert prisdata i systemet.
            Det er kun en observasjons- og rapporteringsvisning – ingen endringer gjøres på data.
          </p>
        </div>

        {/* Report */}
        <MarketCoverageReport />
      </div>
    </div>
  );
}