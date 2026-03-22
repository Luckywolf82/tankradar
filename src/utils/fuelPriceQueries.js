
import { base44 } from "@/api/base44Client";

/**
 * Henter FuelPrice-rader for flere stasjoner og én drivstofftype.
 * Fletter alle resultater i én liste.
 * @param {{ stationIds: string[], fuelType: string, limit?: number }} params
 * @returns {Promise<object[]>} Løfter til liste av FuelPrice-objekter.
 */
export async function fetchFuelPricesByStationsAndFuel({ stationIds, fuelType, limit = 20 }) {
  // TODO: Tilpass base44 API hvis nødvendig (for eksempel endre metode eller parameternavn).
  const results = await Promise.all(
    stationIds.map((id) =>
      base44.entities.FuelPrice.filter(
        { stationId: id, fuelType },
        "-fetchedAt",
        limit
      )
    )
  );
  // Flat liste med resultater fra alle stasjoner
  return results.flat();
}

/**
 * Henter FuelPrice-rader for én stasjon (alle drivstofftyper).
 * Returnerer (som aktuell bruker gjorde: omvendt sortert på fetchedAt).
 * @param {{ stationId: string, limit?: number }} params
 * @returns {Promise<object[]>} Liste av FuelPrice-objekter for stasjonen.
 */
export async function fetchFuelPricesByStation({ stationId, limit = 200 }) {
  // TODO: Hvis Base44 krever annen syntaks, juster her.
  const prices = await base44.entities.FuelPrice.filter(
    { stationId },
    "-fetchedAt",
    limit
  );
  return prices;
}
