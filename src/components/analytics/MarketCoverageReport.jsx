import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function MarketCoverageReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await base44.functions.invoke('reportMarketDataCoverage');
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to load report');
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center p-8">Laster rapport...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
        <AlertCircle className="text-red-600" size={18} />
        <span className="text-red-800">{error}</span>
      </div>
    );
  }

  if (!report) {
    return <div className="text-center p-8">Ingen data tilgjengelig</div>;
  }

  const reportStyles = "text-xs border border-slate-200 bg-white";

  return (
    <div className="space-y-4">
      {/* Refresh button */}
      <div className="flex justify-end">
        <Button
          onClick={loadReport}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={loading}
        >
          <RefreshCw size={14} />
          Oppdater rapport
        </Button>
      </div>

      {/* 1. TOTAL OBSERVASJONER */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">1. TOTAL OBSERVASJONER</CardTitle>
        </CardHeader>
        <CardContent>
          <table className={reportStyles}>
            <tbody>
              <tr className="border-b">
                <td className="p-2 font-semibold">Totalt FuelPrice-poster</td>
                <td className="p-2 text-right font-bold text-slate-800">{report.total}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 2. OBSERVASJONER PER KILDE */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">2. OBSERVASJONER PER KILDE</CardTitle>
        </CardHeader>
        <CardContent>
          <table className={reportStyles + " w-full"}>
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-2 text-left font-semibold">Kilde</th>
                <th className="p-2 text-right font-semibold">Antall</th>
                <th className="p-2 text-right font-semibold">Prosent</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.bySource)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <tr key={source} className="border-b hover:bg-slate-50">
                    <td className="p-2">{source}</td>
                    <td className="p-2 text-right font-semibold">{count}</td>
                    <td className="p-2 text-right text-slate-600">{((count / report.total) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 3. OBSERVASJONER PER BY (topp 20) */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">3. OBSERVASJONER PER BY (Topp 20)</CardTitle>
          <p className="text-xs text-slate-500 mt-1">Basert på locationLabel</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className={reportStyles + " w-full text-xs"}>
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-2 text-left font-semibold">By</th>
                  <th className="p-2 text-right font-semibold">Obs.</th>
                  <th className="p-2 text-right font-semibold">Sample Size</th>
                </tr>
              </thead>
              <tbody>
                {report.byCityTopN.map((city, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="p-2">{city.city}</td>
                    <td className="p-2 text-right font-semibold">{city.count}</td>
                    <td className={`p-2 text-right font-semibold ${
                      city.sampleSize === 'weak' ? 'text-amber-600' :
                      city.sampleSize === 'moderate' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {city.sampleSize === 'weak' ? '⚠️ Weak' :
                       city.sampleSize === 'moderate' ? '⚡ Moderate' :
                       '✓ Strong'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. OBSERVASJONER PER DRIVSTOFFTYPE */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">4. OBSERVASJONER PER DRIVSTOFFTYPE</CardTitle>
        </CardHeader>
        <CardContent>
          <table className={reportStyles + " w-full"}>
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-2 text-left font-semibold">Drivstofftype</th>
                <th className="p-2 text-right font-semibold">Antall</th>
                <th className="p-2 text-right font-semibold">Prosent</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.byFuelType)
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([fuel, count]) => (
                  <tr key={fuel} className="border-b hover:bg-slate-50">
                    <td className="p-2">{fuel}</td>
                    <td className="p-2 text-right font-semibold">{count}</td>
                    <td className="p-2 text-right text-slate-600">{((count / report.total) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 5. DATAKVALITET */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">5. DATAKVALITET (PLAUSIBILITY)</CardTitle>
        </CardHeader>
        <CardContent>
          <table className={reportStyles + " w-full"}>
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-2 text-left font-semibold">Status</th>
                <th className="p-2 text-right font-semibold">Antall</th>
                <th className="p-2 text-right font-semibold">Prosent</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-green-50 hover:bg-green-100">
                <td className="p-2 font-semibold text-green-900">realistic_price</td>
                <td className="p-2 text-right font-semibold text-green-900">{report.byQuality.realistic_price || 0}</td>
                <td className="p-2 text-right font-semibold text-green-900">{report.qualityRatio.realistic_percent}%</td>
              </tr>
              <tr className="border-b bg-amber-50 hover:bg-amber-100">
                <td className="p-2 font-semibold text-amber-900">suspect_price_low</td>
                <td className="p-2 text-right font-semibold text-amber-900">{report.byQuality.suspect_price_low || 0}</td>
                <td className="p-2 text-right text-amber-600">—</td>
              </tr>
              <tr className="border-b bg-red-50 hover:bg-red-100">
                <td className="p-2 font-semibold text-red-900">suspect_price_high</td>
                <td className="p-2 text-right font-semibold text-red-900">{report.byQuality.suspect_price_high || 0}</td>
                <td className="p-2 text-right text-red-600">—</td>
              </tr>
              <tr className="border-b bg-slate-50">
                <td className="p-2 font-semibold">Totalt suspect</td>
                <td className="p-2 text-right font-semibold">{(report.byQuality.suspect_price_low || 0) + (report.byQuality.suspect_price_high || 0)}</td>
                <td className="p-2 text-right">{report.qualityRatio.suspect_percent}%</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 6. MATCH-KVALITET */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">6. MATCH-KVALITET (stationId)</CardTitle>
        </CardHeader>
        <CardContent>
          <table className={reportStyles + " w-full"}>
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-2 text-left font-semibold">Match Status</th>
                <th className="p-2 text-right font-semibold">Antall</th>
                <th className="p-2 text-right font-semibold">Prosent</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-green-50 hover:bg-green-100">
                <td className="p-2 font-semibold text-green-900">Matched (har stationId)</td>
                <td className="p-2 text-right font-semibold text-green-900">{report.byMatchConfidence.matched}</td>
                <td className="p-2 text-right font-semibold text-green-900">{report.matchRatio.matched_percent}%</td>
              </tr>
              <tr className="border-b bg-amber-50 hover:bg-amber-100">
                <td className="p-2 font-semibold text-amber-900">Unmatched (ingen stationId)</td>
                <td className="p-2 text-right font-semibold text-amber-900">{report.byMatchConfidence.unmatched}</td>
                <td className="p-2 text-right font-semibold text-amber-900">{report.matchRatio.unmatched_percent}%</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 7. HISTORISK DEKNING */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">7. HISTORISK DEKNING</CardTitle>
        </CardHeader>
        <CardContent>
          <table className={reportStyles + " w-full"}>
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-2 text-left font-semibold">Periode</th>
                <th className="p-2 text-right font-semibold">Antall</th>
                <th className="p-2 text-right font-semibold">Prosent av total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-slate-50">
                <td className="p-2">Siste 24 timer</td>
                <td className="p-2 text-right font-semibold">{report.historicalCoverage.last24h}</td>
                <td className="p-2 text-right text-slate-600">{((report.historicalCoverage.last24h / report.total) * 100).toFixed(1)}%</td>
              </tr>
              <tr className="border-b hover:bg-slate-50">
                <td className="p-2">Siste 7 dager</td>
                <td className="p-2 text-right font-semibold">{report.historicalCoverage.last7d}</td>
                <td className="p-2 text-right text-slate-600">{((report.historicalCoverage.last7d / report.total) * 100).toFixed(1)}%</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-2">Siste 30 dager</td>
                <td className="p-2 text-right font-semibold">{report.historicalCoverage.last30d}</td>
                <td className="p-2 text-right text-slate-600">{((report.historicalCoverage.last30d / report.total) * 100).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Timestamp */}
      <div className="text-xs text-slate-500 text-center mt-6">
        Rapport generert: {new Date(report.timestamp).toLocaleString('no-NO')}
      </div>
    </div>
  );
}