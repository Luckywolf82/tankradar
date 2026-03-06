import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function VerificationReport() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Verification Report: User Reported Enhancements</h1>
        <p className="text-slate-600">Minimale bakoverkompatible oppdateringer av datamodellen</p>
      </div>

      {/* Status */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-base text-green-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Implementation: COMPLETE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-green-900">
          <div className="flex items-start gap-2">
            <span className="font-bold">✓</span>
            <span>FuelPrice entity: added confidenceReason, gps_latitude, gps_longitude</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold">✓</span>
            <span>LogPrice: sets confidenceReason + GPS data dynamically</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold">✓</span>
            <span>ObservedMarketStatistics: removed confidenceScore from filter</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold">✓</span>
            <span>No changes to: OCR, matching algorithm, thresholds, UI flow</span>
          </div>
        </CardContent>
      </Card>

      {/* 1. Updated FuelPrice Fields */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">1. Oppdaterte FuelPrice-felter</h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nye felter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="font-mono text-sm text-slate-900 font-semibold">confidenceReason</p>
                <p className="text-xs text-slate-600 mt-1">string - Forklaring på hvorfor confidenceScore ble gitt</p>
                <p className="text-xs text-slate-500 mt-2 font-mono">
                  Eksempler:<br/>
                  • "chain_match + name_similarity + distance_close"<br/>
                  • "ambiguous_station + uncertain_distance"<br/>
                  • "no_station_match + gps_signal_only"
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="font-mono text-sm text-slate-900 font-semibold">gps_latitude</p>
                <p className="text-xs text-slate-600 mt-1">number - GPS-breddegrad fra brukerrapport</p>
                <p className="text-xs text-slate-500 mt-2">Brukes for geospatial clustering og ny stasjon discovery</p>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="font-mono text-sm text-slate-900 font-semibold">gps_longitude</p>
                <p className="text-xs text-slate-600 mt-1">number - GPS-lengdegrad fra brukerrapport</p>
                <p className="text-xs text-slate-500 mt-2">Brukes for geospatial clustering og ny stasjon discovery</p>
              </div>
            </div>

            <div className="p-2 bg-blue-50 rounded text-xs text-blue-900 border border-blue-200 mt-3">
              <strong>Bakoverkompatibilitet:</strong> Alle nye felter er optional (null-kompatible)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Example Records */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">2. Eksempler på Lagrede Records</h2>

        {loading ? (
          <p className="text-slate-500 text-center py-6">Laster eksempler fra database...</p>
        ) : (
          <div className="space-y-4">
            {/* Matched Example */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-base text-green-900">matched_station_id</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {examples.matched ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-white rounded border border-green-200">
                        <p className="text-xs font-medium text-slate-600">confidenceScore</p>
                        <p className="text-sm font-bold text-green-700">0.85</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-green-200">
                        <p className="text-xs font-medium text-slate-600">confidenceReason</p>
                        <p className="text-xs font-mono text-slate-900">{examples.matched.confidenceReason}</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-green-200">
                        <p className="text-xs font-medium text-slate-600">gps_latitude</p>
                        <p className="text-xs font-mono text-slate-900">{examples.matched.gps_latitude?.toFixed(6)}</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-green-200">
                        <p className="text-xs font-medium text-slate-600">gps_longitude</p>
                        <p className="text-xs font-mono text-slate-900">{examples.matched.gps_longitude?.toFixed(6)}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded border border-green-200">
                      <p className="text-xs font-medium text-slate-600 mb-1">station_match_notes</p>
                      <p className="text-xs text-slate-700">{examples.matched.station_match_notes}</p>
                    </div>
                    <div className="p-2 bg-green-100 rounded text-xs text-green-900">
                      Pris: {examples.matched.fuelType} @ {examples.matched.priceNok} NOK/L, {examples.matched.locationLabel}
                    </div>
                  </div>
                ) : (
                  <p className="text-green-800 text-center py-4">Ingen matched eksempler i database ennå</p>
                )}
              </CardContent>
            </Card>

            {/* Review Example */}
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base text-amber-900">review_needed_station_match</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {examples.review ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-white rounded border border-amber-200">
                        <p className="text-xs font-medium text-slate-600">confidenceScore</p>
                        <p className="text-sm font-bold text-amber-700">0.50</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-amber-200">
                        <p className="text-xs font-medium text-slate-600">confidenceReason</p>
                        <p className="text-xs font-mono text-slate-900">{examples.review.confidenceReason}</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-amber-200">
                        <p className="text-xs font-medium text-slate-600">gps_latitude</p>
                        <p className="text-xs font-mono text-slate-900">{examples.review.gps_latitude?.toFixed(6)}</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-amber-200">
                        <p className="text-xs font-medium text-slate-600">gps_longitude</p>
                        <p className="text-xs font-mono text-slate-900">{examples.review.gps_longitude?.toFixed(6)}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded border border-amber-200">
                      <p className="text-xs font-medium text-slate-600 mb-1">station_match_notes</p>
                      <p className="text-xs text-slate-700">{examples.review.station_match_notes}</p>
                    </div>
                    <div className="p-2 bg-amber-100 rounded text-xs text-amber-900">
                      Pris: {examples.review.fuelType} @ {examples.review.priceNok} NOK/L, {examples.review.locationLabel}
                    </div>
                  </div>
                ) : (
                  <p className="text-amber-800 text-center py-4">Ingen review_needed eksempler i database ennå</p>
                )}
              </CardContent>
            </Card>

            {/* No Safe Example */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-base text-red-900">no_safe_station_match (discovery metadata)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {examples.nosafe ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-white rounded border border-red-200">
                        <p className="text-xs font-medium text-slate-600">confidenceScore</p>
                        <p className="text-sm font-bold text-red-700">0.30</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-red-200">
                        <p className="text-xs font-medium text-slate-600">confidenceReason</p>
                        <p className="text-xs font-mono text-slate-900">{examples.nosafe.confidenceReason}</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-red-200">
                        <p className="text-xs font-medium text-slate-600">station_name</p>
                        <p className="text-xs text-slate-900">{examples.nosafe.station_name}</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-red-200">
                        <p className="text-xs font-medium text-slate-600">station_chain</p>
                        <p className="text-xs text-slate-900">{examples.nosafe.station_chain}</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-red-200">
                        <p className="text-xs font-medium text-slate-600">gps_latitude</p>
                        <p className="text-xs font-mono text-slate-900">{examples.nosafe.gps_latitude?.toFixed(6)}</p>
                      </div>
                      <div className="p-2 bg-white rounded border border-red-200">
                        <p className="text-xs font-medium text-slate-600">gps_longitude</p>
                        <p className="text-xs font-mono text-slate-900">{examples.nosafe.gps_longitude?.toFixed(6)}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded border border-red-200">
                      <p className="text-xs font-medium text-slate-600 mb-1">station_match_notes</p>
                      <p className="text-xs text-slate-700">{examples.nosafe.station_match_notes}</p>
                    </div>
                    <div className="p-2 bg-red-100 rounded text-xs text-red-900">
                      Pris: {examples.nosafe.fuelType} @ {examples.nosafe.priceNok} NOK/L, {examples.nosafe.locationLabel}
                    </div>
                  </div>
                ) : (
                  <p className="text-red-800 text-center py-4">Ingen no_safe_station_match eksempler i database ennå</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 3. Dashboard Filter Changes */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">3. Oppdatert Dashboard-filter</h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verified Station Statistics Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-900 mb-2">TIDLIGERE:</p>
              <div className="p-2 bg-red-50 rounded border border-red-200 font-mono text-xs text-red-900">
                station_match_status === "matched_station_id"<br/>
                AND confidenceScore === 0.85<br/>
                AND plausibilityStatus === "realistic_price"
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 mb-2">NÅ:</p>
              <div className="p-2 bg-green-50 rounded border border-green-200 font-mono text-xs text-green-900">
                station_match_status === "matched_station_id"<br/>
                AND plausibilityStatus === "realistic_price"<br/>
                <span className="text-green-700">// confidenceScore IKKE brukt som filter</span>
              </div>
            </div>
            <div className="p-2 bg-blue-50 rounded text-xs text-blue-900 border border-blue-200 mt-3">
              <strong>Endring:</strong> confidenceScore er nå metadata/signal, ikke filter-kriterie. Filtrering skjer kun på match status og plausibilitet.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Unmodified Systems */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">4. Umodifiserte Systemer (Bakoverkompatibilitet)</h2>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="space-y-2 pt-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-bold">✓</span>
              <span className="text-blue-900">OCR / Image Scanning - UENDRET</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-bold">✓</span>
              <span className="text-blue-900">InvokeLLM Vision Parsing - UENDRET</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-bold">✓</span>
              <span className="text-blue-900">Matching Algorithm - UENDRET</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-bold">✓</span>
              <span className="text-blue-900">Thresholds (65 / 35) - UENDRET</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-bold">✓</span>
              <span className="text-blue-900">LogPrice UI Flow - UENDRET</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-bold">✓</span>
              <span className="text-blue-900">bulkCreate Flow - UENDRET</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sammendrag: Hva Ble Endret</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left font-semibold">Komponent</th>
                <th className="border border-slate-300 p-2 text-left font-semibold">Endring</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-green-50">
                <td className="border border-slate-300 p-2">FuelPrice Entity</td>
                <td className="border border-slate-300 p-2 text-green-900">+ confidenceReason, gps_latitude, gps_longitude</td>
              </tr>
              <tr className="bg-green-50">
                <td className="border border-slate-300 p-2">LogPrice.js handleSubmit()</td>
                <td className="border border-slate-300 p-2 text-green-900">Sets confidenceReason dynamically, saves GPS + discovery metadata</td>
              </tr>
              <tr className="bg-green-50">
                <td className="border border-slate-300 p-2">ObservedMarketStatistics</td>
                <td className="border border-slate-300 p-2 text-green-900">Removed confidenceScore from filter logic</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 p-2">Alle andre systemer</td>
                <td className="border border-slate-300 p-2 text-slate-600">UENDRET</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">Neste Steg</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-900">
          <div>✓ Datamodell oppdatert</div>
          <div>✓ LogPrice oppdatert for dynamisk metadata</div>
          <div>✓ Dashboard-filtre avkoblinger confidenceScore</div>
          <div>□ Geospatial clustering for station discovery (fremtidigt)</div>
          <div>□ Curator-grensesnitt for review_needed oppløsning</div>
        </CardContent>
      </Card>
    </div>
  );
}