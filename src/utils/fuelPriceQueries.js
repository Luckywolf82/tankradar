import { base44 } from "@/api/base44Client";

/**
 * Fetches fuel prices for a list of station IDs and a selected fuel type.
 * Uses a single broad query then filters client-side to avoid per-station API calls.
 */
export async function fetchFuelPricesByStationsAndFuel({ stationIds, selectedFuel, limit = 20 }) {
  if (!stationIds || stationIds.length === 0) return [];

  const stationIdSet = new Set(stationIds);

  const filter = {};
  if (selectedFuel && selectedFuel !== "all") {
    filter.fuelType = selectedFuel;
  }

  // Single query — fetch recent prices, then filter by nearby station IDs client-side
  const rows = await base44.entities.FuelPrice.filter(filter, "-fetchedAt", 500);

  return rows.filter((p) => p.stationId && stationIdSet.has(p.stationId));
}