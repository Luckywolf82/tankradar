/**
 * SavingsSummaryCard
 *
 * A lightweight "Savings Summary" layer built on top of existing
 * CurrentStationPrices data. Derives insights without any new
 * backend calls, new entities, or persistent user history.
 *
 * ESTIMATES ONLY — all values displayed with "ca", "opptil", "estimert".
 *
 * DATA CONTRACT:
 * - Reads from CurrentStationPrices (same entity as NearbyPrices / usePumpInsight)
 * - Uses isFreshEnoughForNearbyRanking from currentPriceResolver (same rule as pipeline)
 * - No new data models modified
 * - No user history stored
 */

import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, PiggyBank } from "lucide-react";
import { isFreshEnoughForNearbyRanking } from "@/utils/currentPriceResolver";
import { getFuelTypeLabel } from "@/utils/fuelTypeUtils";

const FILL_LITERS = 40;
const NEARBY_RADIUS_KM = 10; // same default as NearbyPrices

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns the fresh price for fuelType from a CSP row, or null.
 * Mirrors extractFreshPrice in usePumpInsight exactly.
 */
function getFreshPrice(row, fuelType) {
  const priceField = fuelType === "gasoline_95" ? "gasoline_95_price"
    : fuelType === "diesel" ? "diesel_price"
    : null;
  const fetchedAtField = fuelType === "gasoline_95" ? "gasoline_95_fetchedAt"
    : fuelType === "diesel" ? "diesel_fetchedAt"
    : null;

  if (!priceField || !fetchedAtField) return null;
  const price = row[priceField];
  const fetchedAt = row[fetchedAtField];
  if (price == null || !fetchedAt) return null;
  if (!isFreshEnoughForNearbyRanking({ fetchedAt, priceNok: price })) return null;
  return price;
}

/**
 * Derives at most 2 insights from the nearby price set.
 *
 * INSIGHT TYPE 1 — LOCAL PRICE SPREAD
 *   Formula: spread = maxPrice - minPrice
 *   Shown if at least 2 fresh nearby prices exist.
 *   "Prisene i nærheten varierer med ca X kr/l (opptil Y kr på 40 l)"
 *
 * INSIGHT TYPE 2 — CONTEXTUAL SAVINGS SIGNAL
 *   Formula: maxSaving = (maxPrice - minPrice) * FILL_LITERS (same as spread * 40)
 *   Only shown when spread > 0.20 kr/l (meaningful threshold).
 *   "Å velge riktig stasjon kan gi deg opptil ca Z kr på én fylling"
 *
 * INSIGHT TYPE 3 — LOW DATA EMPTY STATE
 *   Shown when < 2 fresh prices are available.
 *   "Logg flere priser for å få bedre oversikt over besparelser"
 */
function deriveInsights(freshRows, fuelType) {
  if (freshRows.length < 2) {
    return [{
      type: "low_data",
      spread: null,
      maxSaving: null,
    }];
  }

  const prices = freshRows.map((r) => getFreshPrice(r, fuelType)).filter(Boolean);
  if (prices.length < 2) {
    return [{ type: "low_data", spread: null, maxSaving: null }];
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const spread = maxPrice - minPrice;
  const maxSaving = Math.round(spread * FILL_LITERS);

  return [{
    type: "spread",
    spread,
    maxSaving,
    stationCount: freshRows.length,
  }];
}

/**
 * PUMP MODE AUTHORITY RULE
 * When pumpModeActive=true, PumpModeCard is the single source of truth for
 * contextual savings (cheapest nearby / "you can save X kr").
 * This card must NOT show a competing savings amount in that state.
 * It may only show neutral area context: spread, station count.
 */
export default function SavingsSummaryCard({ selectedFuel, pumpModeActive = false }) {
  const [insights, setInsights] = useState(null); // null = loading
  const [gpsAvailable, setGpsAvailable] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsAvailable(false);
      setInsights([{ type: "low_data" }]);
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;

        const rows = await base44.entities.CurrentStationPrices.list();
        if (cancelled) return;

        // Filter: active stations with coordinates within radius
        const nearby = rows.filter((r) => {
          if (r.stationStatus === "archived_duplicate") return false;
          if (r.latitude == null || r.longitude == null) return false;
          const dist = haversineKm(latitude, longitude, r.latitude, r.longitude);
          return dist <= NEARBY_RADIUS_KM;
        });

        // Filter to rows with a fresh price for selected fuel
        const freshRows = nearby.filter((r) => getFreshPrice(r, selectedFuel) != null);

        if (!cancelled) setInsights(deriveInsights(freshRows, selectedFuel));
      },
      () => {
        // GPS denied or unavailable — show generic low-data state
        if (!cancelled) {
          setGpsAvailable(false);
          setInsights([{ type: "low_data" }]);
        }
      },
      { timeout: 8000, maximumAge: 120000 }
    );

    return () => { cancelled = true; };
  }, [selectedFuel]);

  // Still loading
  if (insights === null) return null;

  const insight = insights[0];
  const fuelLabel = getFuelTypeLabel(selectedFuel);

  // ── INSIGHT: LOW DATA ──────────────────────────────────────────────────────
  if (insight.type === "low_data") {
    return (
      <Card className="shadow-sm border-slate-200 bg-slate-50">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
              <PiggyBank size={14} className="text-slate-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-0.5">Besparelser</p>
              <p className="text-sm text-slate-600 leading-snug">
                Logg flere priser for å få bedre oversikt over besparelser nær deg.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── INSIGHT: SPREAD ────────────────────────────────────────────────────────
  const { spread, maxSaving, stationCount } = insight;

  // Only render if spread is non-trivial (> 0.01 kr/l rounding noise)
  if (spread < 0.01) return null;

  const spreadText = spread.toFixed(2);
  const isMeaningful = spread >= 0.20;

  return (
    <Card className="shadow-sm border-green-100 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingDown size={14} className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-green-700 mb-0.5">
              Prisforskjell nær deg · {fuelLabel}
            </p>
            <p className="text-sm text-slate-700 leading-snug">
              Prisene varierer med ca{" "}
              <span className="font-bold text-slate-800">{spreadText} kr/l</span>{" "}
              blant {stationCount} stasjon{stationCount !== 1 ? "er" : ""} i nærheten.
            </p>
            {/* Only show savings amount when PumpMode is NOT active.
                When PumpMode is active, PumpModeCard is the authority for savings. */}
            {isMeaningful && !pumpModeActive && (
              <p className="text-xs text-slate-500 mt-1">
                Å velge riktig stasjon kan gi opptil ca{" "}
                <span className="font-semibold text-green-700">{maxSaving} kr</span>{" "}
                spart på {FILL_LITERS} liter. (estimert)
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}