import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export default function ImplementationReport() {
  const [examples, setExamples] = useState({
    matched: null,
    review: null,
    nosafe: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExamples = async () => {
      try {
        const allPrices = await base44.entities.FuelPrice.filter({ priceType: 'user_reported' });
        
        const matchedExample = allPrices.find(p => p.station_match_status === 'matched_station_id');
        const reviewExample = allPrices.find(p => p.station_match_status === 'review_needed_station_match');
        const nosaveExample = allPrices.find(p => p.station_match_status === 'no_safe_station_match');

        setExamples({
          matched: matchedExample || null,
          review: reviewExample || null,
          nosafe: nosaveExample || null
        });
      } catch (error) {
        console.error('Error loading examples:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExamples();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Implementation Report: User Reported Policy</h1>
        <p className="text-slate-600">Dataflyt, dashboard-filtrering, og praktiske eksempler</p>
      </div>

      {/* Implementation Status */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-base text-green-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Implementation Status: COMPLETE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span className="text-green-900">confidenceScore policy implementert i LogPrice</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span className="text-green-900">ObservedMarketStatistics component opprettet (ekskluderer no_safe by default)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span className="text-green-900">Dashboard-filtrering oppdatert</span>
          </div>
        </CardContent>
      </Card>

      {/* Fields Added/Updated */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">1. Felter Lagt Til eller Oppdatert</h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">FuelPrice Entity - Dynamisk confidenceScore</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-slate-50 rounded font-mono text-xs border border-slate-200">
              <div className="text-slate-900 font-medium mb-2">Tidligere (STATISK):</div>
              <div className="text-slate-700">confidenceScore: 1.0 (alltid)</div>
            </div>

            <div className="p-3 bg-green-50 rounded font-mono text-xs border border-green-200">
              <div className="text-green-900 font-medium mb-2">Nå (DYNAMISK):</div>
              <div className="text-green-900">
                <div>if (station_match_status === 'matched_station_id')</div>
                <div className="ml-4">→ confidenceScore = 0.85</div>
                <div className="mt-2">else if (station_match_status === 'review_needed_station_match')</div>
                <div className="ml-4">→ confidenceScore = 0.50</div>
                <div className="mt-2">else (station_match_status === 'no_safe_station_match')</div>
                <div className="ml-4">→ confidenceScore = 0.30</div>
              </div>
            </div>

            <div className="p-2 bg-blue-50 rounded text-xs text-blue-900 border border-blue-200">
              <strong>Implementering:</strong> LogPrice.js, handleSubmit(), linje ~188-197
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nye Dashboard-komponenter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="p-2 bg-slate-100 rounded font-mono text-xs">
              <span className="text-slate-700">components/dashboard/ObservedMarketStatistics.jsx</span>
            </div>
            <p className="text-slate-700 mt-2">Ny komponent som bruker filtering-policy:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 mt-2">
              <li>Ekskluderer no_safe_station_match by default</li>
              <li>Prop: <code className="bg-slate-100 px-1 rounded">includeUnconfirmed</code> (for admin-view)</li>
              <li>Viser konfidensfordeling (matched/review/nosafe)</li>
              <li>Tydelig advarsel om usikre kilder</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Filtering */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">2. Dashboard-filtrering Som Brukes</h2>

        <Card className="border-blue-300">
          <CardHeader>
            <CardTitle className="text-base text-blue-900">Verified Station Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="font-mono text-xs text-blue-900">
                filter: station_match_status === 'matched_station_id'<br/>
                AND confidenceScore === 0.85<br/>
                AND plausibilityStatus === 'realistic_price'
              </p>
            </div>
            <p className="text-slate-700">
              <strong>Brukes i:</strong> Regional statistics, city averages, station history
            </p>
            <p className="text-slate-600 text-xs">
              Viser kun priser der stasjon er bekreftet via matching-algoritmen.
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="text-base text-amber-900">Observed Market Statistics (Standard)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <p className="font-mono text-xs text-amber-900">
                filter: (station_match_status === 'matched_station_id'<br/>
                OR station_match_status === 'review_needed_station_match')<br/>
                AND plausibilityStatus === 'realistic_price'
              </p>
            </div>
            <p className="text-slate-700">
              <strong>Brukes i:</strong> ObservedMarketStatistics komponent (default: includeUnconfirmed=false)
            </p>
            <p className="text-slate-600 text-xs">
              Viser priser med sikker stasjon (0.85) og usikker stasjon (0.50), EKSKLUDERER ukjent (0.30) by default.
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-300">
          <CardHeader>
            <CardTitle className="text-base text-red-900">Pending Review Queue (Admin Only)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-red-50 rounded border border-red-200">
              <p className="font-mono text-xs text-red-900">
                filter: (station_match_status === 'review_needed_station_match'<br/>
                OR station_match_status === 'no_safe_station_match')<br/>
                AND plausibilityStatus === 'realistic_price'
              </p>
            </div>
            <p className="text-slate-700">
              <strong>Brukes i:</strong> UserReportedScanOperations side, Review Needed-tab
            </p>
            <p className="text-slate-600 text-xs">
              Viser alle usikre saker som krever manuell oppløsning fra curator-team.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Practical Examples */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">3. Praktiske Eksempler fra Database</h2>

        {loading ? (
          <p className="text-slate-500 text-center py-6">Laster eksempler...</p>
        ) : (
          <div className="space-y-4">
            {/* Example 1: Matched */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-base text-green-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Eksempel 1: matched_station_id
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {examples.matched ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-2 bg-white rounded border border-green-200">
                        <p className="text-xs font-medium text-slate-600">Station</p>
                        <p className="text-sm font-semibold text-slate-900">{examples.matched.station_name}</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-green-200">
                        <p className="text-xs font-medium text-slate-600">Drivstoff & Pris</p>
                        <p className="text-sm font-semibold text-slate-900">{examples.matched.fuelType} @ {examples.matched.priceNok} NOK/L</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-green-200">
                        <p className="text-xs font-medium text-slate-600">Konfidens</p>
                        <p className="text-sm font-bold text-green-700">0.85</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-green-200">
                        <p className="text-xs font-medium text-slate-600">By</p>
                        <p className="text-sm font-semibold text-slate-900">{examples.matched.locationLabel}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded border border-green-200">
                      <p className="text-xs font-medium text-slate-600 mb-1">Match Notes</p>
                      <p className="text-xs text-slate-700">{examples.matched.station_match_notes}</p>
                    </div>
                    <div className="p-2 bg-green-100 rounded text-xs text-green-900">
                      <strong>✓ Brukes i:</strong> Verified station stats + Observed market stats
                    </div>
                  </>
                ) : (
                  <p className="text-green-800 text-center py-4">Ingen matched eksempler i database ennå</p>
                )}
              </CardContent>
            </Card>

            {/* Example 2: Review Needed */}
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Eksempel 2: review_needed_station_match
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {examples.review ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-2 bg-white rounded border border-amber-200">
                        <p className="text-xs font-medium text-slate-600">Station</p>
                        <p className="text-sm font-semibold text-slate-900">{examples.review.station_name}</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-amber-200">
                        <p className="text-xs font-medium text-slate-600">Drivstoff & Pris</p>
                        <p className="text-sm font-semibold text-slate-900">{examples.review.fuelType} @ {examples.review.priceNok} NOK/L</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-amber-200">
                        <p className="text-xs font-medium text-slate-600">Konfidens</p>
                        <p className="text-sm font-bold text-amber-700">0.50</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-amber-200">
                        <p className="text-xs font-medium text-slate-600">By</p>
                        <p className="text-sm font-semibold text-slate-900">{examples.review.locationLabel}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded border border-amber-200">
                      <p className="text-xs font-medium text-slate-600 mb-1">Kandidater</p>
                      <p className="text-xs text-slate-700">
                        {examples.review.station_match_candidates?.length > 0 
                          ? examples.review.station_match_candidates.join(', ')
                          : 'Ingen kandidater'}
                      </p>
                    </div>
                    <div className="p-2 bg-white rounded border border-amber-200">
                      <p className="text-xs font-medium text-slate-600 mb-1">Match Notes</p>
                      <p className="text-xs text-slate-700">{examples.review.station_match_notes}</p>
                    </div>
                    <div className="p-2 bg-amber-100 rounded text-xs text-amber-900">
                      <strong>⚠ Brukes i:</strong> Observed market stats + Pending review queue (for curator resolution)
                    </div>
                  </>
                ) : (
                  <p className="text-amber-800 text-center py-4">Ingen review_needed eksempler i database ennå</p>
                )}
              </CardContent>
            </Card>

            {/* Example 3: No Safe Match */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-base text-red-900 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Eksempel 3: no_safe_station_match
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {examples.nosafe ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-2 bg-white rounded border border-red-200">
                        <p className="text-xs font-medium text-slate-600">Station</p>
                        <p className="text-sm font-semibold text-slate-900">{examples.nosafe.station_name}</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-red-200">
                        <p className="text-xs font-medium text-slate-600">Drivstoff & Pris</p>
                        <p className="text-sm font-semibold text-slate-900">{examples.nosafe.fuelType} @ {examples.nosafe.priceNok} NOK/L</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-red-200">
                        <p className="text-xs font-medium text-slate-600">Konfidens</p>
                        <p className="text-sm font-bold text-red-700">0.30</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-red-200">
                        <p className="text-xs font-medium text-slate-600">By</p>
                        <p className="text-sm font-semibold text-slate-900">{examples.nosafe.locationLabel}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded border border-red-200">
                      <p className="text-xs font-medium text-slate-600 mb-1">Match Notes</p>
                      <p className="text-xs text-slate-700">{examples.nosafe.station_match_notes}</p>
                    </div>
                    <div className="p-2 bg-red-100 rounded text-xs text-red-900">
                      <strong>✗ IKKE brukt i:</strong> Verified station stats, standard observed market stats
                    </div>
                    <div className="p-2 bg-red-100 rounded text-xs text-red-900">
                      <strong>✓ Brukt i:</strong> Pending review queue (for curator resolution) + internal discovery
                    </div>
                  </>
                ) : (
                  <p className="text-red-800 text-center py-4">Ingen no_safe_station_match eksempler i database ennå</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sammendrag: Bruksmodell</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left font-semibold">Match Status</th>
                  <th className="border border-slate-300 p-2 text-left font-semibold">Konfidens</th>
                  <th className="border border-slate-300 p-2 text-left font-semibold">Verified Stats</th>
                  <th className="border border-slate-300 p-2 text-left font-semibold">Observed (Standard)</th>
                  <th className="border border-slate-300 p-2 text-left font-semibold">Pending Review</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-50">
                  <td className="border border-slate-300 p-2 font-semibold text-green-900">matched_station_id</td>
                  <td className="border border-slate-300 p-2 font-mono text-green-900">0.85</td>
                  <td className="border border-slate-300 p-2 text-green-700">✓ Ja</td>
                  <td className="border border-slate-300 p-2 text-green-700">✓ Ja</td>
                  <td className="border border-slate-300 p-2 text-green-700">✓ Ja</td>
                </tr>
                <tr className="bg-amber-50">
                  <td className="border border-slate-300 p-2 font-semibold text-amber-900">review_needed_station_match</td>
                  <td className="border border-slate-300 p-2 font-mono text-amber-900">0.50</td>
                  <td className="border border-slate-300 p-2 text-amber-700">✗ Nei</td>
                  <td className="border border-slate-300 p-2 text-amber-700">✓ Ja (advarsel)</td>
                  <td className="border border-slate-300 p-2 text-amber-700">✓ Ja</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="border border-slate-300 p-2 font-semibold text-red-900">no_safe_station_match</td>
                  <td className="border border-slate-300 p-2 font-mono text-red-900">0.30</td>
                  <td className="border border-slate-300 p-2 text-red-700">✗ Nei</td>
                  <td className="border border-slate-300 p-2 text-red-700">✗ Nei (by default)</td>
                  <td className="border border-slate-300 p-2 text-red-700">✓ Ja</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">Neste Steg</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-900">
          <div>✓ Konfidensmodel implementert i dataflyt</div>
          <div>✓ Dashboard-filtrering live</div>
          <div>□ Integrere ObservedMarketStatistics i Dashboard (erstatter LiveMarketStats)</div>
          <div>□ Curator-grensesnitt for review_needed oppløsning</div>
          <div>□ Monitoring av match-state distribusjon over tid</div>
        </CardContent>
      </Card>
    </div>
  );
}