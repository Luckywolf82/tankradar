import { base44 } from "@/api/base44Client";

/**
 * Fetches fuel prices for a list of station IDs and a selected fuel type.
 * Makes 2 targeted requests (station_level + user_reported) then filters
 * client-side by nearby station IDs. Avoids per-station requests that cause
 * rate limiting.
 */
export async function fetchFuelPricesByStationsAndFuel({ stationIds, selectedFuel }) {
  if (!stationIds || stationIds.length === 0) return [];

  const stationIdSet = new Set(stationIds);

  const fuelFilter = selectedFuel && selectedFuel !== "all" ? { fuelType: selectedFuel } : {};

  const [stationLevelRows, userReportedRows] = await Promise.all([
    base44.entities.FuelPrice.filter(
      { ...fuelFilter, priceType: "station_level" },
      "-fetchedAt",
      500
    ).catch(() => []),
    base44.entities.FuelPrice.filter(
      { ...fuelFilter, priceType: "user_reported" },
      "-fetchedAt",
      200
    ).catch(() => []),
  ]);

  const all = [...stationLevelRows, ...userReportedRows];
  return all.filter((p) => p.stationId && stationIdSet.has(p.stationId));
}