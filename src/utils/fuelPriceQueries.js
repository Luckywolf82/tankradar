import { base44 } from "@/api/base44Client";
import { normalizeFuelType } from "@/utils/fuelTypeUtils";

/**
 * Canonical FuelPrice read helpers.
 *
 * Scope:
 * - read-path only
 * - centralize query shape only
 * - no new business rules
 * - no eligibility logic
 * - no freshness logic
 * - no ranking logic
 * - no hidden fallback across data granularities
 */

const REQUEST_DELAY_MS = 250;

/**
 * Fetch all FuelPrice rows for one station, newest first.
 */
export async function fetchFuelPricesByStation({ stationId, limit = 200 } = {}) {
  if (!stationId) return [];

  return base44.entities.FuelPrice.filter({ stationId }, "-fetchedAt", limit);
}

/**
 * Fetch FuelPrice rows for one station and one selected fuel type, newest first.
 */
export async function fetchFuelPricesByStationAndFuel({
  stationId,
  selectedFuel,
  limit = 20,
} = {}) {
  if (!stationId || !selectedFuel) return [];

  const fuelType = normalizeFuelType(selectedFuel);
  if (!fuelType) return [];

  return base44.entities.FuelPrice.filter(
    { stationId, fuelType },
    "-fetchedAt",
    limit
  );
}

/**
 * Fetch FuelPrice rows for multiple stations and one selected fuel type.
 *
 * Important:
 * - intentionally sequential to reduce 429 risk
 * - supports early stop through shouldContinue()
 * - no eligibility logic
 * - no freshness logic
 * - no ranking logic
 */
export async function fetchFuelPricesByStationsAndFuel({
  stationIds,
  selectedFuel,
  limit = 20,
  shouldContinue = () => true,
} = {}) {
  if (!Array.isArray(stationIds) || stationIds.length === 0 || !selectedFuel) {
    return [];
  }

  const normalizedIds = [...new Set(stationIds.filter(Boolean))];
  if (normalizedIds.length === 0) return [];

  const fuelType = normalizeFuelType(selectedFuel);
  if (!fuelType) return [];

  const results = [];

  for (const stationId of normalizedIds) {
    if (!shouldContinue()) break;

    try {
      const rows = await base44.entities.FuelPrice.filter(
        { stationId, fuelType },
        "-fetchedAt",
        limit
      );

      if (!shouldContinue()) break;
      results.push(...rows);
    } catch (err) {
      console.error("FuelPrice fetch failed for station", stationId, err);
    }

    if (!shouldContinue()) break;
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
  }

  return results;
}

/**
 * Fetch recent realistic FuelPrice rows, newest first.
 */
export async function fetchRecentRealisticFuelPrices({ limit = 200 } = {}) {
  return base44.entities.FuelPrice.filter(
    { plausibilityStatus: "realistic_price" },
    "-fetchedAt",
    limit
  );
}
