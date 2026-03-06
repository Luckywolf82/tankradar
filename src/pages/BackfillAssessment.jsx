import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";

export default function BackfillAssessment() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAssessment();
  }, []);

  const loadAssessment = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('diagnosticBackfillAssessment');
      setReport(response.data || response);
    } catch (err) {
      // Ignore 401 auth errors on public page
      if (err.status !== 401 && !err.message?.includes('Unauthorized')) {
        setError(err.message || 'Failed to load assessment');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Laster backfill-vurdering...</div>;
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

  const tableStyle = "text-xs border border-slate-200 w-full bg-white";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-4 md:p-8">
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
              <CheckCircle2 className="text-green-600" size={32} />
              Backfill Assessment
            </h1>
            <p className="text-slate-500 mt-1">Vurdering av hvilke gamle poster som kan reddes</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="text-sm text-green-600 mb-1">Kan reddes</div>
              <div className="text-3xl font-bold text-green-700">{report.summary.canBeSaved}</div>
              <div className="text-xs text-green-600 mt-2">poster med metadata</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="text-sm text-red-600 mb-1">Skal slettes</div>
              <div className="text-3xl font-bold text-red-700">{report.summary.shouldBeDeleted}</div>
              <div className="text-xs text-red-600 mt-2">broken prices</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="text-sm text-amber-600 mb-1">Usikre</div>
              <div className="text-3xl font-bold text-amber-700">{report.summary.uncertain}</div>
              <div className="text-xs text-amber-600 mt-2">vak metadata</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 mb-1">Total datasett</div>
              <div className="text-3xl font-bold text-slate-700">{report.total}</div>
              <div className="text-xs text-slate-600 mt-2">FuelPrice poster</div>
            </CardContent>
          </Card>
        </div>

        {/* BACKFILL 1: sourceName */}
        <Card className="shadow-md border-blue-200 mb-6">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-base text-blue-900">BACKFILL 1: sourceName</CardTitle>
            <p className="text-sm text-blue-700 mt-2">
              {report.backfill_sourceName.unknownCount} poster ({report.backfill_sourceName.unknownPercentage}%) mangler sourceName
            </p>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Identifiserbare som user_reported:</p>
              <table className={tableStyle}>
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-2 text-left">Kriterium</th>
                    <th className="p-2 text-right">Antall</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-slate-50">
                    <td className="p-2">Ingen stationId (user-reported tegn)</td>
                    <td className="p-2 text-right font-semibold text-blue-600">{report.backfill_sourceName.identifyableAsUserReported}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-2">Metode: WHERE stationId IS NULL</p>
            </div>

            {report.backfill_sourceName.samples.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Eksempler:</p>
                <table className={tableStyle + " text-xs"}>
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-right">Pris</th>
                      <th className="p-2 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.backfill_sourceName.samples.map((s, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-2 font-mono">{s.id.substring(0, 8)}...</td>
                        <td className="p-2 text-right">{s.priceNok} kr</td>
                        <td className="p-2">{s.priceType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
              <strong>Action:</strong> Sett sourceName='user_reported', sourceFrequency='unknown' for alle poster med stationId IS NULL
            </div>
          </CardContent>
        </Card>

        {/* BACKFILL 2: plausibilityStatus */}
        <Card className="shadow-md border-amber-200 mb-6">
          <CardHeader className="bg-amber-50">
            <CardTitle className="text-base text-amber-900">BACKFILL 2: plausibilityStatus</CardTitle>
            <p className="text-sm text-amber-700 mt-2">
              {report.backfill_plausibilityStatus.unknownCount} poster ({report.backfill_plausibilityStatus.unknownPercentage}%) kan klassifiseres retroaktivt
            </p>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Klassifiseringsresultat:</p>
              <table className={tableStyle}>
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-right">Antall</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.backfill_plausibilityStatus.wouldBecomeDist)
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, count]) => (
                      <tr key={status} className="border-b hover:bg-slate-50">
                        <td className="p-2 font-semibold">{status}</td>
                        <td className="p-2 text-right">{count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-2">
                Metode: {report.backfill_plausibilityStatus.method}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
              <strong>Action:</strong> Kjør klassifisering på alle {report.backfill_plausibilityStatus.classifiableCount} poster med unknown status
            </div>
          </CardContent>
        </Card>

        {/* BACKFILL 3: locationLabel */}
        <Card className="shadow-md border-purple-200 mb-6">
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-base text-purple-900">BACKFILL 3: locationLabel</CardTitle>
            <p className="text-sm text-purple-700 mt-2">
              {report.backfill_locationLabel.noLocationCount} poster ({report.backfill_locationLabel.noLocationPercentage}%) mangler lokasjon
            </p>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Hvor kan vi hente locationLabel fra?</p>
              <table className={tableStyle}>
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-2 text-left">Kilder</th>
                    <th className="p-2 text-right">Antall</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-green-50 hover:bg-green-100">
                    <td className="p-2 font-semibold">Via Station.city (stationId)</td>
                    <td className="p-2 text-right font-bold text-green-700">{report.backfill_locationLabel.canLookupFromStationId}</td>
                  </tr>
                  <tr className="border-b bg-red-50">
                    <td className="p-2">Uten stationId (kan ikke hentes)</td>
                    <td className="p-2 text-right font-semibold text-red-700">{report.backfill_locationLabel.cannotLookup}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-2">Metode: {report.backfill_locationLabel.lookupMethod}</p>
            </div>

            {report.backfill_locationLabel.stationIdExamples.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Eksempler på poster som kan slås opp:</p>
                <table className={tableStyle + " text-xs"}>
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">StationId</th>
                      <th className="p-2 text-left">Source</th>
                      <th className="p-2 text-right">Pris</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.backfill_locationLabel.stationIdExamples.map((e, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-2 font-mono">{e.id.substring(0, 8)}...</td>
                        <td className="p-2 font-mono">{e.stationId.substring(0, 8)}...</td>
                        <td className="p-2">{e.source}</td>
                        <td className="p-2 text-right">{e.price} kr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm text-purple-900">
              <strong>Action:</strong> JOIN med Station-entity på stationId, sett locationLabel = Station.city
            </div>
          </CardContent>
        </Card>

        {/* IRREPARABLE */}
        <Card className="shadow-md border-red-300 bg-red-50 mb-6">
          <CardHeader>
            <CardTitle className="text-base text-red-900 flex items-center gap-2">
              <Trash2 size={20} />
              IRREPARABLE: Poster som bør slettes
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div className="space-y-3">
              <div className="border border-red-200 rounded p-3 bg-white">
                <p className="font-semibold text-red-900 mb-1">Broken Prices</p>
                <p className="text-sm text-red-700 mb-2">
                  <strong className="text-lg">{report.irreparable_assessment.brokenPrices.count}</strong> poster med priceNok &lt;= 0 eller null
                </p>
                <p className="text-xs text-slate-600 mb-2">{report.irreparable_assessment.brokenPrices.reason}</p>
                <p className="text-xs font-semibold text-red-800">→ Anbefaling: DELETE</p>
              </div>

              <div className="border border-amber-300 rounded p-3 bg-white">
                <p className="font-semibold text-amber-900 mb-1">Weak Records</p>
                <p className="text-sm text-amber-700 mb-2">
                  <strong className="text-lg">{report.irreparable_assessment.weakRecords.count}</strong> poster med minimal metadata (ingen source/location/plausibility + no stationId)
                </p>
                <p className="text-xs text-slate-600 mb-2">{report.irreparable_assessment.weakRecords.reason}</p>
                <p className="text-xs font-semibold text-amber-800">→ Anbefaling: REVIEW eller DELETE</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ACTION PLAN */}
        <Card className="shadow-md border-slate-200 mb-6">
          <CardHeader className="bg-slate-100">
            <CardTitle className="text-base">Implementeringsplan</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            {Object.entries(report.action_plan).map(([key, action]) => (
              <div key={key} className="border border-slate-200 rounded p-3">
                <p className="font-semibold text-slate-800">{action.action}</p>
                <p className="text-xs text-slate-600 mt-1">Påvirker: <strong>{action.affectedCount} poster</strong></p>
                {action.query && (
                  <p className="text-xs font-mono bg-slate-50 p-2 rounded mt-2 text-slate-700">{action.query}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Timestamp */}
        <div className="text-xs text-slate-500 text-center">
          Vurdering generert: {new Date(report.timestamp).toLocaleString('no-NO')}
        </div>
      </div>
    </div>
  );
}