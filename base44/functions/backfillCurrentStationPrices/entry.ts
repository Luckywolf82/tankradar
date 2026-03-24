import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * BACKFILL: CurrentStationPrices from FuelPrice history
 *
 * Reads all eligible FuelPrice rows and upserts one CurrentStationPrices row per stationId.
 * Safe to run repeatedly — idempotent. Does NOT delete FuelPrice history.
 *
 * Eligibility filter:
 * - stationId must exist
 * - plausibilityStatus = "realistic_price"
 * - fuelType in { gasoline_95, diesel }
 *
 * Canonical selection per stationId:
 * - newest gasoline_95 row by fetchedAt
 * - newest diesel row by fetchedAt
 *
 * Merge rule:
 * - gasoline_95 block populated only from gasoline_95 rows
 * - diesel block populated only from diesel rows
 * - both blocks may coexist in the same row
 *
 * Admin-only: must not be callable by regular users.
 */

const SUPPORTED_FUEL_TYPES = new Set(['gasoline_95', 'diesel']);
const BATCH_SIZE = 500;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // --- STEP 1: DUPLICATE PREFLIGHT ---
    // Detect any existing stationId duplicates before writing anything.
    const allExisting = await base44.asServiceRole.entities.CurrentStationPrices.list();
    const stationIdCount = {};
    for (const row of allExisting) {
      const sid = row.stationId;
      if (!sid) continue;
      stationIdCount[sid] = (stationIdCount[sid] || 0) + 1;
    }
    const duplicateStationIds = Object.entries(stationIdCount)
      .filter(([, count]) => count > 1)
      .map(([sid]) => sid);

    if (duplicateStationIds.length > 0) {
      // Self-repair: for each duplicated stationId, merge all rows into the one
      // with the most complete data and delete the rest.
      const repaired = [];
      for (const stationId of duplicateStationIds) {
        const dupes = allExisting.filter(r => r.stationId === stationId)
          .sort((a, b) => new Date(b.updatedAt || b.updated_date) - new Date(a.updatedAt || a.updated_date));

        // Canonical row = most recently updated
        const canonical = dupes[0];
        const extras = dupes.slice(1);

        // Merge fuel blocks from extras into canonical
        const mergedPatch = {};
        for (const extra of extras) {
          // Gasoline block: take from extra only if canonical is missing it
          if (!canonical.gasoline_95_price && extra.gasoline_95_price) {
            mergedPatch.gasoline_95_price = extra.gasoline_95_price;
            mergedPatch.gasoline_95_fetchedAt = extra.gasoline_95_fetchedAt;
            mergedPatch.gasoline_95_confidenceScore = extra.gasoline_95_confidenceScore;
            mergedPatch.gasoline_95_plausibilityStatus = extra.gasoline_95_plausibilityStatus;
            mergedPatch.gasoline_95_stationMatchStatus = extra.gasoline_95_stationMatchStatus;
          }
          // Diesel block: take from extra only if canonical is missing it
          if (!canonical.diesel_price && extra.diesel_price) {
            mergedPatch.diesel_price = extra.diesel_price;
            mergedPatch.diesel_fetchedAt = extra.diesel_fetchedAt;
            mergedPatch.diesel_confidenceScore = extra.diesel_confidenceScore;
            mergedPatch.diesel_plausibilityStatus = extra.diesel_plausibilityStatus;
            mergedPatch.diesel_stationMatchStatus = extra.diesel_stationMatchStatus;
          }
        }

        if (Object.keys(mergedPatch).length > 0) {
          await base44.asServiceRole.entities.CurrentStationPrices.update(canonical.id, { ...mergedPatch, updatedAt: now });
        }

        // Delete extra rows
        for (const extra of extras) {
          await base44.asServiceRole.entities.CurrentStationPrices.delete(extra.id);
        }

        repaired.push({ stationId, merged: extras.length });
      }

      console.log(`[backfill] Repaired ${repaired.length} duplicate stationId(s) before backfill`);
    }

    // --- STEP 2: LOAD ALL ELIGIBLE FUELPRICE ROWS ---
    // Load in batches to avoid memory pressure.
    let allFuelPrices = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.FuelPrice.list('-fetchedAt', BATCH_SIZE, skip);
      if (!batch || batch.length === 0) break;
      allFuelPrices = allFuelPrices.concat(batch);
      if (batch.length < BATCH_SIZE) break;
      skip += BATCH_SIZE;
    }

    // Filter eligible rows
    const eligible = allFuelPrices.filter(fp =>
      fp.stationId &&
      fp.plausibilityStatus === 'realistic_price' &&
      SUPPORTED_FUEL_TYPES.has(fp.fuelType)
    );

    // --- STEP 3: GROUP BY stationId, PICK NEWEST PER FUEL TYPE ---
    // canonical[stationId] = { gasoline_95: latestRow, diesel: latestRow }
    const canonical = {};

    for (const fp of eligible) {
      const { stationId, fuelType, fetchedAt } = fp;
      if (!canonical[stationId]) {
        canonical[stationId] = { gasoline_95: null, diesel: null };
      }
      const existing = canonical[stationId][fuelType];
      if (!existing || new Date(fetchedAt) > new Date(existing.fetchedAt)) {
        canonical[stationId][fuelType] = fp;
      }
    }

    const stationIds = Object.keys(canonical);

    // --- STEP 4: LOAD STATION METADATA ---
    const allStations = await base44.asServiceRole.entities.Station.list();
    const stationMap = {};
    for (const s of allStations) {
      stationMap[s.id] = s;
    }

    // --- STEP 5: RELOAD EXISTING CurrentStationPrices (post-dedup) ---
    const existingRows = await base44.asServiceRole.entities.CurrentStationPrices.list();
    const existingByStationId = {};
    for (const row of existingRows) {
      if (row.stationId) {
        existingByStationId[row.stationId] = row;
      }
    }

    // --- STEP 6: UPSERT ONE ROW PER stationId (WITH IDENTITY GUARD) ---
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let identityGuardSkipped = 0;

    for (const stationId of stationIds) {
      // ── IDENTITY GUARD ──────────────────────────────────────────────────────
      // Verify stationId is a canonical Station.id, not a sourceStationId.
      // If it's a sourceStationId, skip and log — do not write CSP.
      const stationCheck = stationMap[stationId];
      if (!stationCheck) {
        // stationId not found in Station.id — check if it matches a sourceStationId
        const sourceMatch = allStations.find(s => s.sourceStationId === stationId);
        if (sourceMatch) {
          console.error(`[backfillCSP] IDENTITY GUARD BLOCKED: stationId="${stationId}" is a sourceStationId, not a Station.id. Canonical id="${sourceMatch.id}".`);
          identityGuardSkipped++;
          continue;
        }
        // Truly orphan — skip silently
        console.warn(`[backfillCSP] stationId="${stationId}" not found in Station catalog — skipping`);
        identityGuardSkipped++;
        continue;
      }
      // ── END IDENTITY GUARD ──────────────────────────────────────────────────

      const { gasoline_95: g95Row, diesel: dslRow } = canonical[stationId];
      const station = stationMap[stationId];

      const stationMeta = station
        ? {
            stationName: station.name || null,
            stationChain: station.chain || null,
            latitude: station.latitude ?? null,
            longitude: station.longitude ?? null,
          }
        : {};

      // Determine sourceName from newest row overall
      const newerRow = g95Row && dslRow
        ? (new Date(g95Row.fetchedAt) >= new Date(dslRow.fetchedAt) ? g95Row : dslRow)
        : (g95Row || dslRow);
      const sourceName = newerRow?.sourceName || null;

      const patch = {
        ...stationMeta,
        sourceName,
        updatedAt: now,
      };

      if (g95Row) {
        patch.gasoline_95_price = g95Row.priceNok;
        patch.gasoline_95_fetchedAt = g95Row.fetchedAt || now;
        patch.gasoline_95_confidenceScore = g95Row.confidenceScore ?? null;
        patch.gasoline_95_plausibilityStatus = g95Row.plausibilityStatus || null;
        patch.gasoline_95_stationMatchStatus = g95Row.station_match_status || null;
        patch.gasoline_95_priceType = g95Row.priceType || null;
      }

      if (dslRow) {
        patch.diesel_price = dslRow.priceNok;
        patch.diesel_fetchedAt = dslRow.fetchedAt || now;
        patch.diesel_confidenceScore = dslRow.confidenceScore ?? null;
        patch.diesel_plausibilityStatus = dslRow.plausibilityStatus || null;
        patch.diesel_stationMatchStatus = dslRow.station_match_status || null;
        patch.diesel_priceType = dslRow.priceType || null;
      }

      const existingRow = existingByStationId[stationId];
      if (existingRow) {
        await base44.asServiceRole.entities.CurrentStationPrices.update(existingRow.id, patch);
        updated++;
      } else {
        await base44.asServiceRole.entities.CurrentStationPrices.create({ stationId, ...patch });
        created++;
      }
    }

    return Response.json({
      status: 'backfill_complete',
      eligible_fuel_price_rows: eligible.length,
      station_ids_processed: stationIds.length,
      created,
      updated,
      skipped,
      duplicates_repaired: duplicateStationIds.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});