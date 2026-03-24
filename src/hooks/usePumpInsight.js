/**
 * usePumpInsight
 *
 * Derives a certainty-aware pump insight from CurrentStationPrices data.
 * Called in Dashboard, passed as pumpInsight prop into PumpModeCard.
 *
 * Single-source-of-truth rule:
 * - Market calculations must come from currentMarketEngine
 * - This hook only fetches CSP rows and maps market context -> UI insight
 */

import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getCurrentMarketContext } from "@/utils/currentMarketEngine";

const PUMP_CONTEXT_RADIUS_KM = 10;
const FILL_LITERS = 40;

function normalizeFuelType(fuelType) {
  // currentMarketEngine should ideally support all active fuel types.
  // If gasoline_98 is not yet supported there, do NOT fake certainty.
  if (fuelType === "diesel") return "diesel";
  if (fuelType === "gasoline_95") return "gasoline_95";
  if (fuelType === "gasoline_98") return "gasoline_98";
  return null;
}

function resolvePumpInsight(market) {
  if (!market) {
    return {
      type: "insufficient_fresh_nearby_data",
      text: "Vi har for få ferske priser i området akkurat nå. Registrer prisen her for å gjøre prisbildet bedre.",
      market: null,
    };
  }

  // Missing or unusable price on current/pump station
  if (!market.currentStationPrice) {
    return {
      type: "missing_station_price",
      text: "Vi mangler oppdatert pris på denne stasjonen. Registrer den her for å gjøre sammenligningen mer treffsikker.",
      market,
    };
  }

  // Already among the cheapest / cheapest
  if (market.isCurrentStationCheapest) {
    return {
      type: "among_cheapest",
      text: "Denne stasjonen er blant de billigste i nærheten 🔥",
      market,
    };
  }

  // Cheaper nearby alternative exists
  if (market.savingsVsCheapest > 0) {
    return {
      type: "cheaper_alternative_exists",
      text: `Du kan potensielt spare ca ${Math.round(
        market.savingsVsCheapest
      )} kr på ${FILL_LITERS} liter ved å velge billigste alternativ.`,
      market,
    };
  }

  // Fallback: enough data exists, but no strong action should be claimed
  return {
    type: "stale_station_price",
    text: "Prisen her kan være utdatert. Oppdater den for å få et mer nøyaktig sammenligningsgrunnlag.",
    market,
  };
}

/**
 * @param {string|null} pumpStationId
 * @param {string} selectedFuel
 */
export function usePumpInsight(pumpStationId, selectedFuel) {
  const [pumpInsight, setPumpInsight] = useState(null);

  useEffect(() => {
    if (!pumpStationId || !selectedFuel) {
      setPumpInsight(null);
      return;
    }

    const normalizedFuel = normalizeFuelType(selectedFuel);
    if (!normalizedFuel) {
      setPumpInsight(null);
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const rows = await base44.entities.CurrentStationPrices.list();
        if (cancelled) return;

        const withCoords = rows.filter(
          (r) =>
            r.latitude != null &&
            r.longitude != null &&
            r.stationStatus !== "archived_duplicate"
        );

        const pumpRow = withCoords.find((r) => r.stationId === pumpStationId);

        // If we do not even have the station row/coords, do not overclaim.
        if (!pumpRow || pumpRow.latitude == null || pumpRow.longitude == null) {
          setPumpInsight({
            type: "missing_station_price",
            text: "Vi mangler oppdatert pris på denne stasjonen. Registrer den her for å gjøre sammenligningen mer treffsikker.",
            market: null,
          });
          return;
        }

        // Use the detected pump station as the center for “nearby” market context.
        const market = getCurrentMarketContext({
          cspRows: withCoords,
          selectedFuel: normalizedFuel,
          currentStationId: pumpStationId,
          userCoords: {
            lat: pumpRow.latitude,
            lon: pumpRow.longitude,
          },
          radiusKm: PUMP_CONTEXT_RADIUS_KM,
        });

        if (cancelled) return;

        setPumpInsight(resolvePumpInsight(market));
      } catch {
        if (!cancelled) {
          setPumpInsight(null);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [pumpStationId, selectedFuel]);

  return pumpInsight;
}
