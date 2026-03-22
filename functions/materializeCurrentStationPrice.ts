import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * MATERIALIZATION FUNCTION: CurrentStationPrices
 *
 * Called by entity automation on FuelPrice create/update.
 *
 * Rules:
 * - Only rows with a valid stationId are processed.
 * - Only rows with plausibilityStatus = "realistic_price" are processed.
 * - Only fuelType "gasoline_95" or "diesel" are handled.
 * - gasoline_95 fields are updated only from gasoline_95 rows (diesel block untouched).
 * - diesel fields are updated only from diesel rows (gasoline_95 block untouched).
 * - Station metadata (name, chain, lat, lon) is fetched from Station catalog and stored
 *   so future Nearby reads need only CurrentStationPrices — no separate Station lookup.
 * - One row per stationId is maintained (upsert pattern).
 * - FuelPrice history is never touched.
 */

const SUPPORTED_FUEL_TYPES = new Set(['gasoline_95', 'diesel']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Automation passes entity data under payload.data; direct calls may pass flat object
    const fuelPrice = payload.data || payload;

    if (!fuelPrice || !fuelPrice.stationId) {
      return Response.json({ skipped: true, reason: 'no_stationId' });
    }

    if (fuelPrice.plausibilityStatus !== 'realistic_price') {
      return Response.json({ skipped: true, reason: `plausibilityStatus=${fuelPrice.plausibilityStatus}` });
    }

    if (!SUPPORTED_FUEL_TYPES.has(fuelPrice.fuelType)) {
      return Response.json({ skipped: true, reason: `unsupported_fuelType=${fuelPrice.fuelType}` });
    }

    const {
      stationId,
      fuelType,
      priceNok,
      fetchedAt,
      confidenceScore,
      plausibilityStatus,
      station_match_status,
      sourceName,
    } = fuelPrice;

    const now = new Date().toISOString();

    // Fetch station metadata from Station catalog for the station-level fields.
    // These are snapshotted so Nearby reads need only CurrentStationPrices.
    let stationMeta = {};
    try {
      const station = await base44.asServiceRole.entities.Station.filter({ id: stationId });
      if (station && station.length > 0) {
        const s = station[0];
        stationMeta = {
          stationName: s.name || null,
          stationChain: s.chain || null,
          latitude: s.latitude ?? null,
          longitude: s.longitude ?? null,
        };
      }
    } catch (_) {
      // Non-fatal: station metadata will remain as previously stored or null
    }

    // Find existing CurrentStationPrices row for this stationId
    const existing = await base44.asServiceRole.entities.CurrentStationPrices.filter({ stationId });

    // Build fuel-specific patch — only the block for the incoming fuelType
    let fuelPatch;
    if (fuelType === 'gasoline_95') {
      fuelPatch = {
        gasoline_95_price: priceNok,
        gasoline_95_fetchedAt: fetchedAt || now,
        gasoline_95_confidenceScore: confidenceScore ?? null,
        gasoline_95_plausibilityStatus: plausibilityStatus || null,
        gasoline_95_stationMatchStatus: station_match_status || null,
      };
    } else {
      // diesel
      fuelPatch = {
        diesel_price: priceNok,
        diesel_fetchedAt: fetchedAt || now,
        diesel_confidenceScore: confidenceScore ?? null,
        diesel_plausibilityStatus: plausibilityStatus || null,
        diesel_stationMatchStatus: station_match_status || null,
      };
    }

    const patch = {
      ...stationMeta,
      ...fuelPatch,
      sourceName: sourceName || null,
      updatedAt: now,
    };

    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.CurrentStationPrices.update(existing[0].id, patch);
      return Response.json({ action: 'updated', stationId, fuelType, rowId: existing[0].id });
    } else {
      const created = await base44.asServiceRole.entities.CurrentStationPrices.create({ stationId, ...patch });
      return Response.json({ action: 'created', stationId, fuelType, rowId: created.id });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});