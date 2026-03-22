import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * MATERIALIZATION FUNCTION: CurrentStationPrices
 *
 * Triggered by FuelPrice entity automations (create + update events).
 *
 * Rules:
 * - Only processes rows with a valid stationId
 * - Only processes rows with plausibilityStatus === "realistic_price"
 * - Only processes canonical fuelType: "gasoline_95" or "diesel"
 * - Updates ONLY the fields for the incoming fuelType — does not overwrite the other fuel's fields
 * - Creates the CurrentStationPrices row if it doesn't exist yet
 * - Updates it if it already exists and the incoming fetchedAt is newer (or equal)
 *
 * Does NOT delete FuelPrice rows.
 * Does NOT modify FuelPrice rows.
 * Does NOT affect matching, eligibility, or resolver logic.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Entity automations send the payload directly — no user auth required.
    // Use service role for all DB operations.
    const payload = await req.json();

    // Support both direct invocation (for testing) and entity automation payload shape
    const fuelPriceRow = payload.data || payload;

    if (!fuelPriceRow) {
      return Response.json({ skipped: true, reason: 'no_data' });
    }

    const {
      stationId,
      fuelType,
      priceNok,
      fetchedAt,
      confidenceScore,
      plausibilityStatus,
      sourceName,
    } = fuelPriceRow;

    // Gate 1: must have a stationId
    if (!stationId) {
      return Response.json({ skipped: true, reason: 'no_stationId' });
    }

    // Gate 2: must be a realistic price
    if (plausibilityStatus !== 'realistic_price') {
      return Response.json({ skipped: true, reason: `plausibility_gated: ${plausibilityStatus}` });
    }

    // Gate 3: must be a supported canonical fuelType
    const SUPPORTED_FUEL_TYPES = ['gasoline_95', 'diesel'];
    if (!SUPPORTED_FUEL_TYPES.includes(fuelType)) {
      return Response.json({ skipped: true, reason: `unsupported_fuelType: ${fuelType}` });
    }

    const now = new Date().toISOString();

    // Look up existing CurrentStationPrices row for this station
    const existing = await base44.asServiceRole.entities.CurrentStationPrices.filter({ stationId });
    const existingRow = existing && existing.length > 0 ? existing[0] : null;

    // Build the partial update — only touch fields for the incoming fuelType
    const fuelUpdate = {};
    if (fuelType === 'gasoline_95') {
      // Only update if incoming fetchedAt is newer (or no existing value)
      const existingFetchedAt = existingRow?.gasoline_95_fetchedAt;
      if (!existingFetchedAt || new Date(fetchedAt) >= new Date(existingFetchedAt)) {
        fuelUpdate.gasoline_95_price = priceNok;
        fuelUpdate.gasoline_95_fetchedAt = fetchedAt;
        fuelUpdate.gasoline_95_confidenceScore = confidenceScore ?? null;
      } else {
        return Response.json({ skipped: true, reason: 'gasoline_95_stale: incoming fetchedAt is older than stored' });
      }
    } else if (fuelType === 'diesel') {
      const existingFetchedAt = existingRow?.diesel_fetchedAt;
      if (!existingFetchedAt || new Date(fetchedAt) >= new Date(existingFetchedAt)) {
        fuelUpdate.diesel_price = priceNok;
        fuelUpdate.diesel_fetchedAt = fetchedAt;
        fuelUpdate.diesel_confidenceScore = confidenceScore ?? null;
      } else {
        return Response.json({ skipped: true, reason: 'diesel_stale: incoming fetchedAt is older than stored' });
      }
    }

    // Always update shared metadata
    fuelUpdate.sourceName = sourceName || null;
    fuelUpdate.updatedAt = now;

    let result;
    if (existingRow) {
      // Update existing row — only the relevant fuel fields + shared metadata
      result = await base44.asServiceRole.entities.CurrentStationPrices.update(existingRow.id, fuelUpdate);
      return Response.json({ action: 'updated', stationId, fuelType, rowId: existingRow.id });
    } else {
      // Create new row
      const newRow = {
        stationId,
        ...fuelUpdate,
      };
      result = await base44.asServiceRole.entities.CurrentStationPrices.create(newRow);
      return Response.json({ action: 'created', stationId, fuelType, rowId: result?.id });
    }

  } catch (error) {
    console.error('[materializeCurrentStationPrice] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});