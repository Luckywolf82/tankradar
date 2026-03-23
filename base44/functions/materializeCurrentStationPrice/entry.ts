import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * MATERIALIZATION FUNCTION: CurrentStationPrices
 *
 * Called by entity automation on FuelPrice create/update.
 *
 * INVARIANT: ONE row per stationId.
 *
 * Rules:
 * - Only rows with a valid stationId are processed.
 * - Only rows with plausibilityStatus = "realistic_price" are processed.
 * - Only fuelType "gasoline_95" or "diesel" are handled.
 * - gasoline_95 block updated only from gasoline_95 rows (diesel block untouched).
 * - diesel block updated only from diesel rows (gasoline_95 block untouched).
 * - Station metadata snapshotted from Station catalog so Nearby needs no separate lookup.
 * - If a race condition produces duplicate rows (two concurrent creates), the duplicate
 *   is detected immediately and self-healed: extra rows are merged into the oldest row
 *   and deleted.
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

    // Snapshot station metadata from Station catalog.
    let stationMeta = {};
    try {
      const stationRows = await base44.asServiceRole.entities.Station.filter({ id: stationId });
      if (stationRows && stationRows.length > 0) {
        const s = stationRows[0];
        stationMeta = {
          stationName: s.name || null,
          stationChain: s.chain || null,
          stationStatus: s.status || 'active',
          latitude: s.latitude ?? null,
          longitude: s.longitude ?? null,
        };
      }
    } catch (_) {
      // Non-fatal: station metadata will remain as previously stored or null
    }

    // Build fuel-specific patch — only the block for the incoming fuelType.
    // The other fuel block is untouched (not present in patch = not overwritten by Base44 update).
    let fuelPatch;
    if (fuelType === 'gasoline_95') {
      fuelPatch = {
        gasoline_95_price: priceNok,
        gasoline_95_fetchedAt: fetchedAt || now,
        gasoline_95_confidenceScore: confidenceScore ?? null,
        gasoline_95_plausibilityStatus: plausibilityStatus || null,
        gasoline_95_stationMatchStatus: station_match_status || null,
        gasoline_95_priceType: fuelPrice.priceType || null,
      };
    } else {
      fuelPatch = {
        diesel_price: priceNok,
        diesel_fetchedAt: fetchedAt || now,
        diesel_confidenceScore: confidenceScore ?? null,
        diesel_plausibilityStatus: plausibilityStatus || null,
        diesel_stationMatchStatus: station_match_status || null,
        diesel_priceType: fuelPrice.priceType || null,
      };
    }

    const patch = {
      ...stationMeta,
      ...fuelPatch,
      sourceName: sourceName || null,
      updatedAt: now,
    };

    // UPSERT with post-write deduplication guard.
    // Find all existing rows for this stationId (should be 0 or 1; >1 signals a race condition).
    const existing = await base44.asServiceRole.entities.CurrentStationPrices.filter({ stationId });

    let action;
    let canonicalRowId;

    if (existing && existing.length > 0) {
      // UPDATE the canonical row (oldest by created_date to be deterministic)
      const sorted = [...existing].sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
      canonicalRowId = sorted[0].id;
      const canonical = sorted[0];

      // STALENESS GUARD: Only update fuel block if incoming fetchedAt is newer than stored fetchedAt.
      // This prevents older backfill events from overwriting fresher data.
      const existingFetchedAt = fuelType === 'gasoline_95'
        ? canonical.gasoline_95_fetchedAt
        : canonical.diesel_fetchedAt;
      const incomingFetchedAt = fetchedAt || now;

      if (existingFetchedAt && new Date(incomingFetchedAt) <= new Date(existingFetchedAt)) {
        return Response.json({ skipped: true, reason: `stale_price: incoming ${incomingFetchedAt} <= existing ${existingFetchedAt}`, stationId, fuelType });
      }

      await base44.asServiceRole.entities.CurrentStationPrices.update(canonicalRowId, patch);
      action = 'updated';

      // SELF-HEAL: if a race condition created extras, merge their complementary fuel block
      // into the canonical row and delete the extras.
      if (sorted.length > 1) {
        const extras = sorted.slice(1);
        const mergePatch = {};
        for (const extra of extras) {
          // Take the complementary fuel block from the extra if canonical is missing it
          if (fuelType === 'gasoline_95' && extra.diesel_price && !sorted[0].diesel_price) {
            mergePatch.diesel_price = extra.diesel_price;
            mergePatch.diesel_fetchedAt = extra.diesel_fetchedAt;
            mergePatch.diesel_confidenceScore = extra.diesel_confidenceScore;
            mergePatch.diesel_plausibilityStatus = extra.diesel_plausibilityStatus;
            mergePatch.diesel_stationMatchStatus = extra.diesel_stationMatchStatus;
          }
          if (fuelType === 'diesel' && extra.gasoline_95_price && !sorted[0].gasoline_95_price) {
            mergePatch.gasoline_95_price = extra.gasoline_95_price;
            mergePatch.gasoline_95_fetchedAt = extra.gasoline_95_fetchedAt;
            mergePatch.gasoline_95_confidenceScore = extra.gasoline_95_confidenceScore;
            mergePatch.gasoline_95_plausibilityStatus = extra.gasoline_95_plausibilityStatus;
            mergePatch.gasoline_95_stationMatchStatus = extra.gasoline_95_stationMatchStatus;
          }
          await base44.asServiceRole.entities.CurrentStationPrices.delete(extra.id);
        }
        if (Object.keys(mergePatch).length > 0) {
          await base44.asServiceRole.entities.CurrentStationPrices.update(canonicalRowId, { ...mergePatch, updatedAt: now });
        }
        action = `updated+healed_${extras.length}_duplicates`;
      }

    } else {
      // CREATE the first (and only) row for this stationId
      const created = await base44.asServiceRole.entities.CurrentStationPrices.create({ stationId, ...patch });
      canonicalRowId = created.id;
      action = 'created';
    }

    return Response.json({ action, stationId, fuelType, rowId: canonicalRowId });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});