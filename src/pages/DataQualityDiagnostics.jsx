import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, AlertTriangle } from "lucide-react";

export default function DataQualityDiagnostics() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await base44.functions.invoke('diagnosticDataQuality');
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to load diagnostics');
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center p-8">Laster diagnostikk...</div>;
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

  const tableStyles = "text-xs border border-slate-200 bg-white w-full";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 p-4 md:p-8">
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
              <AlertTriangle className="text-red-600" size={32} />
              Data Quality Diagnostics
            </h1>
            <p className="text-slate-500 mt-1">Analyse av datakvalitetsproblemer</p>
          </div>
        </div>

        {/* PROBLEM 1: locationLabel */}
        <Card className="shadow-md border-red-200 mb-6">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-base text-red-900">PROBLEM 1: locationLabel Mangler</CardTitle>
            <p className="text-sm text-red-700 mt-2">
              <strong>{report.locationLabel.noLocation} av {report.total}</strong> poster har locationLabel = "no_location"
            </p>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Oversikt:</p>
              <table className={tableStyles}>
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-right">Antall</th>
                    <th className="p-2 text-right">Prosent</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-red-50">
                    <td className="p-2">Med lokasjonsnavn</td>
                    <td className="p-2 text-right font-semibold">{report.locationLabel.hasLocation}</td>
                    <td className="p-2 text-right">{((report.locationLabel.hasLocation / report.total) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr className="border-b bg-red-100">
                    <td className="p-2 font-semibold">Uten lokasjonsnavn</td>
                    <td className="p-2 text-right font-bold text-red-900">{report.locationLabel.noLocation}</td>
                    <td className="p-2 text-right font-bold text-red-900">{((report.locationLabel.noLocation / report.total) * 100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Top 15 Lokasjoner (der de finnes):</p>
              <table className={tableStyles + " text-xs"}>
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-2 text-left">By</th>
                    <th className="p-2 text-right">Obs.</th>
                    <th className="p-2 text-right">%</th>
                    <th className="p-2 text-left">Kilder</th>
                  </tr>
                </thead>
                <tbody>
                  {report.locationLabel.topLocations.map((loc, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      <td className="p-2">{loc.location === 'no_location' ? '⚠️ NO_LOCATION' : loc.location}</td>
                      <td className="p-2 text-right font-semibold">{loc.count}</td>
                      <td className="p-2 text-right">{loc.percentage}%</td>
                      <td className="p-2 text-xs">{loc.sources.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* PROBLEM 2: sourceName */}
        <Card className="shadow-md border-red-200 mb-6">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-base text-red-900">PROBLEM 2: sourceName Ukjent</CardTitle>
            <p className="text-sm text-red-700 mt-2">
              <strong>{report.sourceName.unknownCount}</strong> poster har sourceName = "unknown" eller mangler
            </p>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Fordeling per kilde:</p>
              <table className={tableStyles}>
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-2 text-left">Kilde</th>
                    <th className="p-2 text-right">Antall</th>
                    <th className="p-2 text-right">Prosent</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.sourceName.bySource)
                    .sort((a, b) => b[1] - a[1])
                    .map(([source, count]) => (
                      <tr key={source} className={`border-b ${source === 'unknown' ? 'bg-red-100' : ''}`}>
                        <td className={`p-2 ${source === 'unknown' ? 'font-bold text-red-900' : ''}`}>
                          {source === 'unknown' ? '⚠️ UNKNOWN' : source}
                        </td>
                        <td className="p-2 text-right font-semibold">{count}</td>
                        <td className="p-2 text-right">{((count / report.total) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {report.sourceName.unknownSample.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Eksempler på "unknown"-poster:</p>
                <table className={tableStyles + " text-xs"}>
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Location</th>
                      <th className="p-2 text-left">Fuel Type</th>
                      <th className="p-2 text-right">Pris</th>
                      <th className="p-2 text-left">Hentet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sourceName.unknownSample.map((rec, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-2 font-mono text-xs">{rec.id.substring(0, 8)}...</td>
                        <td className="p-2">{rec.locationLabel || 'N/A'}</td>
                        <td className="p-2">{rec.fuelType}</td>
                        <td className="p-2 text-right">{rec.priceNok} kr</td>
                        <td className="p-2 text-xs">{new Date(rec.fetchedAt).toLocaleString('no-NO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PROBLEM 3: plausibilityStatus */}
        <Card className="shadow-md border-red-200 mb-6">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-base text-red-900">PROBLEM 3: Bare {report.plausibility.byStatus.realistic_price} Realistic Prices</CardTitle>
            <p className="text-sm text-red-700 mt-2">
              Kun <strong>{report.plausibility.byStatus.realistic_price}</strong> av {report.total} poster er klassifisert som realistic_price
            </p>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Fordeling per plausibility status:</p>
              <table className={tableStyles}>
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-right">Antall</th>
                    <th className="p-2 text-right">Prosent</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={`border-b ${report.plausibility.byStatus.realistic_price > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <td className="p-2 font-semibold">realistic_price</td>
                    <td className="p-2 text-right font-bold">{report.plausibility.byStatus.realistic_price}</td>
                    <td className="p-2 text-right">{((report.plausibility.byStatus.realistic_price / report.total) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr className="border-b bg-amber-50">
                    <td className="p-2">suspect_price_low</td>
                    <td className="p-2 text-right font-semibold">{report.plausibility.byStatus.suspect_price_low}</td>
                    <td className="p-2 text-right">{((report.plausibility.byStatus.suspect_price_low / report.total) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr className="border-b bg-red-50">
                    <td className="p-2">suspect_price_high</td>
                    <td className="p-2 text-right font-semibold">{report.plausibility.byStatus.suspect_price_high}</td>
                    <td className="p-2 text-right">{((report.plausibility.byStatus.suspect_price_high / report.total) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">unknown</td>
                    <td className="p-2 text-right font-semibold">{report.plausibility.byStatus.unknown}</td>
                    <td className="p-2 text-right">{((report.plausibility.byStatus.unknown / report.total) * 100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {Object.keys(report.plausibility.realisticBySource).length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Realistic prices per kilde:</p>
                <table className={tableStyles}>
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-2 text-left">Kilde</th>
                      <th className="p-2 text-right">Realistic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.plausibility.realisticBySource)
                      .sort((a, b) => b[1] - a[1])
                      .map(([source, count]) => (
                        <tr key={source} className="border-b hover:bg-slate-50">
                          <td className="p-2">{source}</td>
                          <td className="p-2 text-right font-semibold">{count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {report.plausibility.suspectPrices.lowSample.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Eksempler på "suspect_price_low" ({report.plausibility.suspectPrices.lowCount} total):</p>
                <table className={tableStyles + " text-xs"}>
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-2 text-right">Pris</th>
                      <th className="p-2 text-left">Kilde</th>
                      <th className="p-2 text-left">By</th>
                      <th className="p-2 text-left">Drivstoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.plausibility.suspectPrices.lowSample.map((rec, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-2 text-right font-mono font-semibold text-amber-600">{rec.priceNok} kr</td>
                        <td className="p-2">{rec.sourceName}</td>
                        <td className="p-2">{rec.locationLabel || 'N/A'}</td>
                        <td className="p-2 text-xs">{rec.fuelType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {report.plausibility.suspectPrices.highSample.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Eksempler på "suspect_price_high" ({report.plausibility.suspectPrices.highCount} total):</p>
                <table className={tableStyles + " text-xs"}>
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-2 text-right">Pris</th>
                      <th className="p-2 text-left">Kilde</th>
                      <th className="p-2 text-left">By</th>
                      <th className="p-2 text-left">Drivstoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.plausibility.suspectPrices.highSample.map((rec, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-2 text-right font-mono font-semibold text-red-600">{rec.priceNok} kr</td>
                        <td className="p-2">{rec.sourceName}</td>
                        <td className="p-2">{rec.locationLabel || 'N/A'}</td>
                        <td className="p-2 text-xs">{rec.fuelType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cross-problem: No location AND no source */}
        {report.problematic.noLocationAndNoSource > 0 && (
          <Card className="shadow-md border-red-300 bg-red-50 mb-6">
            <CardHeader>
              <CardTitle className="text-base text-red-900">KRITISK: {report.problematic.noLocationAndNoSource} poster har både NO_LOCATION og UNKNOWN SOURCE</CardTitle>
            </CardHeader>
            <CardContent className="mt-4">
              <p className="text-sm text-red-800 mb-4">Disse postene er helt ubrukelige for analyse:</p>
              <table className={tableStyles + " text-xs"}>
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Source</th>
                    <th className="p-2 text-left">Location</th>
                    <th className="p-2 text-right">Pris</th>
                    <th className="p-2 text-left">Plausibility</th>
                  </tr>
                </thead>
                <tbody>
                  {report.problematic.sample.map((rec, idx) => (
                    <tr key={idx} className="border-b bg-red-100 hover:bg-red-200">
                      <td className="p-2 font-mono text-xs">{rec.id.substring(0, 8)}...</td>
                      <td className="p-2 font-semibold">{rec.sourceName || 'unknown'}</td>
                      <td className="p-2">{rec.locationLabel || 'no_location'}</td>
                      <td className="p-2 text-right">{rec.priceNok} kr</td>
                      <td className="p-2 text-xs">{rec.plausibilityStatus || 'unknown'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Timestamp */}
        <div className="text-xs text-slate-500 text-center mt-6">
          Diagnostikk generert: {new Date(report.timestamp).toLocaleString('no-NO')}
        </div>
      </div>
    </div>
  );
}