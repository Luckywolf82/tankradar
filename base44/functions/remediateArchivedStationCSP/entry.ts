/**
 * remediateArchivedStationCSP
 *
 * DATA REMEDIATION — Admin only.
 *
 * Problem: mergeDuplicateStations correctly re-points FuelPrice rows and soft-archives
 * duplicate Station records, but does NOT clean CurrentStationPrices (CSP). This leaves
 * stale CSP rows pointing at archived stationIds still driving active NearbyPrices output.
 *
 * This function performs a full, safe cleanup in 5 steps:
 *
 *   Step 1: Load all archived_duplicate Station records.
 *   Step 2: Find CSP rows that reference an archived stationId — these must be removed.
 *   Step 3: Find any FuelPrice rows still on an archived stationId (merge may have missed
 *           them in a race condition) — re-point to canonical stationId via StationMergeLog.
 *   Step 4: Delete all stale CSP rows on archived stationIds.
 *   Step 5: For each affected canonical stationId, trigger a CSP rebuild from FuelPrice history
 *           so the canonical row reflects the freshest possible price data.
 *
 * SAFETY:
 *   - Read-only unless curator_confirmation: true is in payload.
 *   - Admin-only endpoint.
 *   - Does not modify Station, StationMergeLog, matching engine, or Phase 2 functions.
 *   - Idempotent: safe to run multiple times.
 *
 * Payload:
 *   { curator_confirmation: true, dry_run?: boolean }
 *
 * Returns full audit report.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SUPPORTED_FUEL_TYPES = new Set(['gasoline_95', 'diesel']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    if (!dryRun && body.curator_confirmation !== true) {
      return Response.json(
        { error: 'curator_confirmation must be true, or pass dry_run: true to preview.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const report = {
      dry_run: dryRun,
      timestamp: now,
      archivedStations: [],
      staleCSPRows: [],
      strayFuelPriceRows: [],
      cspDeleted: 0,
      fuelPriceRepointed: 0,
      canonicalCSPRebuilt: [],
      errors: [],
    };

    // ── STEP 1: Load all archived_duplicate stations ──────────────────────────
    const archivedStations = await base44.asServiceRole.entities.Station.filter({
      status: 'archived_duplicate',
    });

    if (!archivedStations || archivedStations.length === 0) {
      return Response.json({
        ...report,
        summary: 'No archived_duplicate stations found. Nothing to remediate.',
      });
    }

    const archivedIds = new Set(archivedStations.map((s) => s.id));
    report.archivedStations = archivedStations.map((s) => ({ id: s.id, name: s.name }));

    // ── STEP 2: Load StationMergeLog to know canonical mappings ──────────────
    // MergeLog tells us: for each archived stationId, what is the canonical stationId.
    const mergeLogs = await base44.asServiceRole.entities.StationMergeLog.list();
    // Build map: legacyId → canonicalId
    const legacyToCanonical = {};
    for (const log of mergeLogs) {
      if (!log.merged_station_ids || !log.canonical_station_id) continue;
      for (const legacyId of log.merged_station_ids) {
        // If multiple logs reference the same legacyId, prefer the most recent
        if (!legacyToCanonical[legacyId]) {
          legacyToCanonical[legacyId] = log.canonical_station_id;
        }
      }
    }

    // ── STEP 3: Find stale CSP rows on archived stationIds ───────────────────
    const allCSP = await base44.asServiceRole.entities.CurrentStationPrices.list();
    const staleCSP = allCSP.filter((row) => row.stationId && archivedIds.has(row.stationId));
    report.staleCSPRows = staleCSP.map((r) => ({
      id: r.id,
      stationId: r.stationId,
      stationName: r.stationName,
      canonical: legacyToCanonical[r.stationId] || null,
    }));

    // ── STEP 4: Find stray FuelPrice rows still on archived stationIds ────────
    // Load all FuelPrice rows — we need to check all archived stationIds.
    // To avoid loading the entire table for large datasets, filter per archived ID.
    const strayFuelPrices = [];
    for (const archivedId of archivedIds) {
      const rows = await base44.asServiceRole.entities.FuelPrice.filter({ stationId: archivedId });
      for (const row of rows) {
        strayFuelPrices.push({ ...row, _archivedStationId: archivedId });
      }
    }
    report.strayFuelPriceRows = strayFuelPrices.map((r) => ({
      id: r.id,
      stationId: r.stationId,
      fuelType: r.fuelType,
      canonical: legacyToCanonical[r.stationId] || null,
    }));

    if (dryRun) {
      return Response.json({
        ...report,
        summary: `DRY RUN — ${staleCSP.length} stale CSP rows would be deleted, ${strayFuelPrices.length} FuelPrice rows would be re-pointed. No writes performed.`,
      });
    }

    // ── STEP 5: Re-point stray FuelPrice rows to canonical stationId ──────────
    for (const fp of strayFuelPrices) {
      const canonicalId = legacyToCanonical[fp.stationId];
      if (!canonicalId) {
        report.errors.push({
          type: 'stray_fuelprice_no_canonical',
          fuelPriceId: fp.id,
          archivedStationId: fp.stationId,
          note: 'No StationMergeLog entry found for this archived stationId. Row left in place.',
        });
        continue;
      }
      try {
        await base44.asServiceRole.entities.FuelPrice.update(fp.id, {
          stationId: canonicalId,
        });
        report.fuelPriceRepointed++;
      } catch (err) {
        report.errors.push({ type: 'fuelprice_repoint_failed', fuelPriceId: fp.id, error: err.message });
      }
    }

    // ── STEP 6: Delete stale CSP rows on archived stationIds ─────────────────
    for (const row of staleCSP) {
      try {
        await base44.asServiceRole.entities.CurrentStationPrices.delete(row.id);
        report.cspDeleted++;
      } catch (err) {
        report.errors.push({ type: 'csp_delete_failed', cspId: row.id, error: err.message });
      }
    }

    // ── STEP 7: Rebuild CSP for affected canonical stationIds ─────────────────
    // For each canonical stationId that was affected, rebuild its CSP row by scanning
    // FuelPrice history (now including the re-pointed rows from step 5).
    const affectedCanonicals = new Set();
    for (const row of staleCSP) {
      const c = legacyToCanonical[row.stationId];
      if (c) affectedCanonicals.add(c);
    }

    for (const canonicalId of affectedCanonicals) {
      try {
        // Load all FuelPrice rows for this canonical station
        const allPrices = await base44.asServiceRole.entities.FuelPrice.filter({
          stationId: canonicalId,
        });

        const eligible = allPrices.filter(
          (fp) =>
            fp.plausibilityStatus === 'realistic_price' &&
            SUPPORTED_FUEL_TYPES.has(fp.fuelType)
        );

        // Pick newest per fuelType
        let latestG95 = null;
        let latestDsl = null;
        for (const fp of eligible) {
          if (fp.fuelType === 'gasoline_95') {
            if (!latestG95 || new Date(fp.fetchedAt) > new Date(latestG95.fetchedAt)) {
              latestG95 = fp;
            }
          } else if (fp.fuelType === 'diesel') {
            if (!latestDsl || new Date(fp.fetchedAt) > new Date(latestDsl.fetchedAt)) {
              latestDsl = fp;
            }
          }
        }

        if (!latestG95 && !latestDsl) {
          report.canonicalCSPRebuilt.push({ canonicalId, action: 'skipped_no_eligible_prices' });
          continue;
        }

        // Load station metadata
        let stationMeta = {};
        try {
          const stations = await base44.asServiceRole.entities.Station.filter({ id: canonicalId });
          if (stations && stations.length > 0) {
            const s = stations[0];
            stationMeta = {
              stationName: s.name || null,
              stationChain: s.chain || null,
              stationStatus: s.status || 'active',
              latitude: s.latitude ?? null,
              longitude: s.longitude ?? null,
            };
          }
        } catch (_) { /* non-fatal */ }

        const patch = {
          ...stationMeta,
          updatedAt: now,
        };

        if (latestG95) {
          patch.gasoline_95_price = latestG95.priceNok;
          patch.gasoline_95_fetchedAt = latestG95.fetchedAt;
          patch.gasoline_95_confidenceScore = latestG95.confidenceScore ?? null;
          patch.gasoline_95_plausibilityStatus = latestG95.plausibilityStatus || null;
          patch.gasoline_95_stationMatchStatus = latestG95.station_match_status || null;
          patch.gasoline_95_priceType = latestG95.priceType || null;
          patch.sourceName = latestG95.sourceName || null;
        }
        if (latestDsl) {
          patch.diesel_price = latestDsl.priceNok;
          patch.diesel_fetchedAt = latestDsl.fetchedAt;
          patch.diesel_confidenceScore = latestDsl.confidenceScore ?? null;
          patch.diesel_plausibilityStatus = latestDsl.plausibilityStatus || null;
          patch.diesel_stationMatchStatus = latestDsl.station_match_status || null;
          patch.diesel_priceType = latestDsl.priceType || null;
          if (!patch.sourceName) patch.sourceName = latestDsl.sourceName || null;
        }

        // Upsert canonical CSP row
        const existingCSP = await base44.asServiceRole.entities.CurrentStationPrices.filter({
          stationId: canonicalId,
        });

        let action;
        if (existingCSP && existingCSP.length > 0) {
          await base44.asServiceRole.entities.CurrentStationPrices.update(existingCSP[0].id, patch);
          action = 'updated';
          // Remove any extra duplicate canonical rows
          if (existingCSP.length > 1) {
            for (const extra of existingCSP.slice(1)) {
              await base44.asServiceRole.entities.CurrentStationPrices.delete(extra.id);
            }
            action = `updated+deleted_${existingCSP.length - 1}_extra_canonical_dupes`;
          }
        } else {
          await base44.asServiceRole.entities.CurrentStationPrices.create({ stationId: canonicalId, ...patch });
          action = 'created';
        }

        report.canonicalCSPRebuilt.push({ canonicalId, action, g95Price: latestG95?.priceNok ?? null, dslPrice: latestDsl?.priceNok ?? null });
      } catch (err) {
        report.errors.push({ type: 'canonical_csp_rebuild_failed', canonicalId, error: err.message });
      }
    }

    // ── STEP 8: Final verification ────────────────────────────────────────────
    // Spot-check: confirm zero CSP rows remain on any archived stationId
    const finalCSP = await base44.asServiceRole.entities.CurrentStationPrices.list();
    const residualStale = finalCSP.filter((r) => r.stationId && archivedIds.has(r.stationId));

    return Response.json({
      ...report,
      verification: {
        residual_stale_csp_rows: residualStale.length,
        residual_stale_csp_station_ids: residualStale.map((r) => r.stationId),
        verdict: residualStale.length === 0 ? 'CLEAN' : 'RESIDUAL_STALE_DETECTED',
      },
      summary: `Deleted ${report.cspDeleted} stale CSP rows, re-pointed ${report.fuelPriceRepointed} FuelPrice rows, rebuilt CSP for ${report.canonicalCSPRebuilt.length} canonical station(s). Errors: ${report.errors.length}.`,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});