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

/**
 * Fetch all FuelPrice rows for one station, newest first.
 *
 * Intended use:
 * - StationDetails broader station history
 * - Other single-station read paths that need station-level FuelPrice rows
 *
 * Behavior preserved:
 * - same query shape as existing StationDetails read path
 * - same sort order
 * - same default limit
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
 *
 * Intended use:
 * - station-level fuel-specific display paths
 *
 * Notes:
 * - selectedFuel is normalized here, not at the call site
 * - returns [] if stationId or selectedFuel is missing
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
 * Intended use:
 * - NearbyPrices and similar multi-station station-price display paths
 *
 * Behavior preserved:
 * - same per-station query pattern currently used by NearbyPrices
 * - same sort order
 * - same default per-station limit
 *
 * Important:
 * - centralizes query shape only
 * - does not apply eligibility filtering
 * - does not apply freshness filtering
 * - does not rank results
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

  const results = await Promise.all(
    normalizedIds.map((stationId) =>
      base44.entities.FuelPrice.filter(
        { stationId, fuelType },
        "-fetchedAt",
        limit
      )
    )
  );

  return results.flat();
}

/**
 * Fetch recent realistic FuelPrice rows, newest first.
 *
 * Intended use:
 * - feeds such as RecentPricesFeed before canonical eligibility is applied
 *
 * Important:
 * - this is not the display-eligibility layer
 * - callers must still apply isStationPriceDisplayEligible(...)
 *   plus any view-specific constraints like nearby station membership
 */
export async function fetchRecentRealisticFuelPrices({ limit = 200 } = {}) {
  return base44.entities.FuelPrice.filter(
    { plausibilityStatus: "realistic_price" },
    "-fetchedAt",
    limit
  );
}
