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
 * - gasoline_95 fields are updated only from gasoline_95 rows.
 * - diesel fields are updated only from diesel rows.
 * - One row per stationId is maintained (upsert pattern).
 * - FuelPrice history is never touched.
 */

const SUPPORTED_FUEL_TYPES = new Set(['gasoline_95', 'diesel']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Support direct call with a FuelPrice object (automation passes data field)
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

    const { stationId, fuelType, priceNok, fetchedAt, confidenceScore, sourceName } = fuelPrice;

    // Upsert: find existing row for this stationId
    const existing = await base44.asServiceRole.entities.CurrentStationPrices.filter({ stationId });
    const now = new Date().toISOString();

    if (fuelType === 'gasoline_95') {
      // Only update gasoline_95 fields — do not touch diesel fields
      const patch = {
        gasoline_95_price: priceNok,
        gasoline_95_fetchedAt: fetchedAt || now,
        gasoline_95_confidenceScore: confidenceScore ?? null,
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
    }

    if (fuelType === 'diesel') {
      // Only update diesel fields — do not touch gasoline_95 fields
      const patch = {
        diesel_price: priceNok,
        diesel_fetchedAt: fetchedAt || now,
        diesel_confidenceScore: confidenceScore ?? null,
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
    }

    return Response.json({ skipped: true, reason: 'unhandled_path' });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});