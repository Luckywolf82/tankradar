import { base44 } from "@/api/base44Client";

/**
 * Fetches fuel prices for a list of station IDs and a selected fuel type.
 * Returns an array of FuelPrice records.
 */
export async function fetchFuelPricesByStationsAndFuel({ stationIds, selectedFuel, limit = 20 }) {
  if (!stationIds || stationIds.length === 0) return [];

  const BATCH_SIZE = 10;
  const batches = [];
  for (let i = 0; i < stationIds.length; i += BATCH_SIZE) {
    batches.push(stationIds.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map((batch) => {
      const filter = { stationId: { $in: batch } };
      if (selectedFuel && selectedFuel !== "all") {
        filter.fuelType = selectedFuel;
      }
      return base44.entities.FuelPrice.filter(filter, "-fetchedAt", limit);
    })
  );

  return results.flat();
}