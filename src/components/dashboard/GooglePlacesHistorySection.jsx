import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import StationHistoryCard from "./StationHistoryCard";

/**
 * GooglePlacesHistorySection
 * 
 * Displays historical FuelPrice observations from GooglePlaces.
 * 
 * - Groups by stationId + fuelType
 * - Shows each combination separately
 * - Clearly marks as supplement source with partial coverage
 * - Does NOT blend with national_average or other sources
 * - Shows empty state if no GooglePlaces observations exist
 */

const fuelTypeLabel = {
  gasoline_95: "Bensin 95",
  gasoline_98: "Bensin 98",
  diesel: "Diesel",
};

export default function GooglePlacesHistorySection({ prices }) {
  // Filter only GooglePlaces station_level prices
  const googlePlacesPrices = useMemo(() => {
    return prices.filter(p => 
      p.sourceName === "GooglePlaces" && 
      p.priceType === "station_level"
    );
  }, [prices]);

  // Group by stationId + fuelType
  const grouped = useMemo(() => {
    const groups = {};
    
    googlePlacesPrices.forEach(obs => {
      const key = `${obs.stationId}_${obs.fuelType}`;
      if (!groups[key]) {
        groups[key] = {
          stationId: obs.stationId,
          stationName: obs.stationName || obs.locationLabel || "(Ukjent)",
          chain: obs.chain || "(Ukjent kjede)",
          fuelType: obs.fuelType,
          observations: []
        };
      }
      groups[key].observations.push(obs);
    });

    return Object.values(groups);
  }, [googlePlacesPrices]);

  if (grouped.length === 0) {
    return (
      <Card className="shadow-sm border-slate-200 bg-slate-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-700">
            GooglePlaces – Stasjonspriser
          </CardTitle>
          <p className="text-xs text-slate-500 mt-2">
            ℹ️ <em>Supplement-kilde – partial coverage – supplement til nasjonalt snitt</em>
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-3 bg-slate-100 rounded border border-slate-300">
            <AlertCircle size={16} className="text-slate-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-slate-700 font-medium">Ingen GooglePlaces-data ennå</p>
              <p className="text-xs text-slate-600 mt-1">
                Data fra Google Places vil vises her når stasjoner er matchet med OpenStreetMap og priser er hentet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-2">GooglePlaces – Stasjonspriser</h3>
        <p className="text-sm text-slate-600 mb-4">
          ℹ️ <em>Supplement-kilde med partial coverage. Viser historiske observasjoner per stasjon + drivstofftype.</em>
        </p>
      </div>

      {/* Group by source coverage / station count */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {grouped.map((group) => (
          <StationHistoryCard
            key={`${group.stationId}_${group.fuelType}`}
            stationId={group.stationId}
            stationName={group.stationName}
            chain={group.chain}
            fuelType={group.fuelType}
            fuelLabel={fuelTypeLabel[group.fuelType] || group.fuelType}
            observations={group.observations}
          />
        ))}
      </div>

      {/* Coverage summary */}
      <Card className="shadow-sm border-slate-200 bg-blue-50">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-900">
            <strong>Dekkingsstatus:</strong> {grouped.length} stasjon{grouped.length !== 1 ? "er" : ""} 
            {" "}med {googlePlacesPrices.length} pris-observasjon{googlePlacesPrices.length !== 1 ? "er" : ""}
            {" "}fra GooglePlaces.
          </p>
          <p className="text-xs text-blue-700 mt-2">
            Disse er supplement til nasjonale snittpriser og skal <strong>ikke blandes</strong> uten eksplisitt markering.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}