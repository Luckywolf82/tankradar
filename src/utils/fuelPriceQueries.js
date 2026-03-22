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

const BATCH_SIZE = 5;

/**
 * Fetch all FuelPrice rows for one station, newest first.
 */
export async function fetchFuelPricesByStation({ stationId, limit = 200 } = {}) {
  if (!stationId) return [];

  return base44.entities.FuelPrice.filter(
    { stationId },
    "-fetchedAt",
    limit
  );
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
 * Uses small batches to reduce 429 risk.
 */
export async function fetchFuelPricesByStationsAndFuel({
  stationIds,
  selectedFuel,
  limit = 20,
} = {}) {
  if (!Array.isArray(stationIds) || stationIds.length === 0 || !selectedFuel) {
    return [];
  }

  const normalizedIds = stationIds.filter(Boolean);
  if (normalizedIds.length === 0) return [];

  const fuelType = normalizeFuelType(selectedFuel);
  if (!fuelType) return [];

  const results = [];

  for (let i = 0; i < normalizedIds.length; i += BATCH_SIZE) {
    const batch = normalizedIds.slice(i, i + BATCH_SIZE);

    try {
      const batchResults = await Promise.all(
        batch.map((stationId) =>
          base44.entities.FuelPrice.filter(
            { stationId, fuelType },
            "-fetchedAt",
            limit
          )
        )
      );

      results.push(...batchResults.flat());
    } catch (err) {
      console.error("FuelPrice batch fetch failed", err);
    }
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
