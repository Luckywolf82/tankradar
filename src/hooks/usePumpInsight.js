/**
 * usePumpInsight
 *
 * Derives a certainty-aware pump insight from CurrentStationPrices data.
 * Called in Dashboard, passed as pumpInsight prop into PumpModeCard.
 *
 * No new entities. No new backend calls beyond what NearbyPrices already does.
 * Uses the same CurrentStationPrices entity — the browser will typically serve
 * it from the same in-flight or recently-resolved request.
 *
 * CERTAINTY RULES:
 * - Never claim "cheapest" without a fresh price on the pump station itself
 * - Never claim savings without both prices being fresh
 * - When certainty is low → turn it into a logging prompt
 */

import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { isFreshEnoughForNearbyRanking } from "@/utils/currentPriceResolver";

const FILL_LITERS = 40; // Standard estimate for savings calculation

/**
 * Extracts the price for a given fuelType from a CSP row.
 * Returns null if missing or stale.
 */
function extractFreshPrice(cspRow, fuelType) {
  if (!cspRow) return null;

  const priceField = fuelType === "gasoline_95" ? "gasoline_95_price"
    : fuelType === "diesel" ? "diesel_price"
    : null;

  const fetchedAtField = fuelType === "gasoline_95" ? "gasoline_95_fetchedAt"
    : fuelType === "diesel" ? "diesel_fetchedAt"
    : null;

  if (!priceField || !fetchedAtField) return null;

  const price = cspRow[priceField];
  const fetchedAt = cspRow[fetchedAtField];

  if (price == null || !fetchedAt) return null;

  // Reuse same freshness check as NearbyPrices pipeline
  const mockRow = { fetchedAt, priceNok: price };
  if (!isFreshEnoughForNearbyRanking(mockRow)) return null;

  return price;
}

/**
 * @param {string} pumpStationId  — the stationId detected by PumpModeCard
 * @param {string} selectedFuel   — "diesel" | "gasoline_95" | "gasoline_98"
 */
export function usePumpInsight(pumpStationId, selectedFuel) {
  const [pumpInsight, setPumpInsight] = useState(null);

  useEffect(() => {
    if (!pumpStationId || !selectedFuel) {
      setPumpInsight(null);
      return;
    }

    let cancelled = false;

    base44.entities.CurrentStationPrices.list()
      .then((rows) => {
        if (cancelled) return;

        // Only use rows with coordinates (mirrors NearbyPrices pipeline)
        const withCoords = rows.filter(
          (r) => r.latitude != null && r.longitude != null && r.stationStatus !== "archived_duplicate"
        );

        // Rows with a fresh price for selected fuel
        const freshRows = withCoords.filter((r) => extractFreshPrice(r, selectedFuel) != null);

        if (freshRows.length === 0) {
          // No fresh data in area at all
          setPumpInsight({
            type: "insufficient_fresh_nearby_data",
            text: "Vi har for få ferske priser i området akkurat nå. Registrer prisen her for å gjøre prisbildet bedre.",
          });
          return;
        }

        // Find the pump station in CSP
        const pumpRow = withCoords.find((r) => r.stationId === pumpStationId);
        const pumpPrice = extractFreshPrice(pumpRow, selectedFuel);

        if (pumpPrice == null) {
          // Fresh data exists in area, but NOT for this station
          setPumpInsight({
            type: "missing_station_price",
            text: "Vi mangler oppdatert pris på denne stasjonen. Registrer den her for å gjøre sammenligningen mer treffsikker.",
          });
          return;
        }

        // We have a fresh price for the pump station. Now compare.
        const sortedByPrice = [...freshRows].sort(
          (a, b) => extractFreshPrice(a, selectedFuel) - extractFreshPrice(b, selectedFuel)
        );

        const cheapestPrice = extractFreshPrice(sortedByPrice[0], selectedFuel);
        const pumpRank = sortedByPrice.findIndex((r) => r.stationId === pumpStationId);

        // Among top 3 cheapest?
        if (pumpRank !== -1 && pumpRank <= 2) {
          setPumpInsight({
            type: "among_cheapest",
            text: "Denne stasjonen er blant de billigste i nærheten 🔥",
          });
          return;
        }

        // Cheaper alternative exists — calculate estimated savings
        const savings = Math.round((pumpPrice - cheapestPrice) * FILL_LITERS);
        if (savings > 0) {
          setPumpInsight({
            type: "cheaper_alternative_exists",
            text: `Du kan potensielt spare ca ${savings} kr på ${FILL_LITERS} liter ved å velge billigste alternativ.`,
          });
          return;
        }

        // Fallback: we have fresh data but no meaningful difference
        setPumpInsight(null);
      })
      .catch(() => {
        if (!cancelled) setPumpInsight(null);
      });

    return () => { cancelled = true; };
  }, [pumpStationId, selectedFuel]);

  return pumpInsight;
}