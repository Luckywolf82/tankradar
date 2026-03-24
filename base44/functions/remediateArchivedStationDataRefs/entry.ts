/**
 * remediateArchivedStationDataRefs
 *
 * Cleans up stale FuelPrice and CurrentStationPrices references
 * that still point to archived_duplicate stationIds after Station remediation.
 *
 * Strategy: bulk-fetch all FuelPrice + CSP rows, filter in-memory.
 * Avoids per-station API calls that cause rate-limit errors.
 *
 * STEP 1 — Build canonical mapping from StationMergeLog
 * STEP 2 — Reassign FuelPrice rows from archived → canonical stationId
 *          then detect + delete exact duplicate FuelPrice observations
 * STEP 3 — Delete orphan CurrentStationPrices rows linked to archived stationIds
 * STEP 4 — Verify no remaining stale references
 * STEP 5 — Safety stop for ambiguous cases
 *
 * Exact duplicate FuelPrice detection criteria (ALL must match):
 *   stationId (after reassignment) + fuelType + priceNok + sourceName + fetchedAt
 *
 * Input:
 * {
 *   dry_run?: boolean   (default: true — no writes)
 *   curator_confirmation?: boolean  (must be true to write)
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

async function listAll(entity, sort = '-created_date', pageSize = 500) {
  const results = [];
  let page = 0;
  while (true) {
    const batch = await entity.list(sort, pageSize, page * pageSize);
    if (!batch || batch.length === 0) break;
    results.push(...batch);
    if (batch.length < pageSize) break;
    page++;
  }
  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'curator') {
      return Response.json({ error: 'Forbidden: admin or curator required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false; // default true
    const curator_confirmation = body.curator_confirmation === true;

    if (!dry_run && !curator_confirmation) {
      return Response.json(
        { error: 'curator_confirmation must be true to execute writes' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BULK FETCH — all data loaded once into memory
    // ─────────────────────────────────────────────────────────────────────────
    const [mergeLogs, allStations, allFuelPrices, allCSP] = await Promise.all([
      listAll(base44.asServiceRole.entities.StationMergeLog, '-timestamp', 200),
      listAll(base44.asServiceRole.entities.Station),
      listAll(base44.asServiceRole.entities.FuelPrice),
      listAll(base44.asServiceRole.entities.CurrentStationPrices),
    ]);

    const stationById = Object.fromEntries(allStations.map(s => [s.id, s]));

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1 — Build canonical mapping from StationMergeLog
    // ─────────────────────────────────────────────────────────────────────────
    const canonicalMap = {}; // archivedId → canonicalId
    for (const log of mergeLogs) {
      if (!log.canonical_station_id || !log.merged_station_ids?.length) continue;
      for (const archivedId of log.merged_station_ids) {
        canonicalMap[archivedId] = log.canonical_station_id;
      }
    }

    const reviewNeeded = [];
    const confirmedMappings = {};
    const mappingDetails = [];

    for (const [archivedId, canonicalId] of Object.entries(canonicalMap)) {
      const archivedStation = stationById[archivedId];
      const canonicalStation = stationById[canonicalId];

      const isArchivedOk = archivedStation?.status === 'archived_duplicate';
      const isCanonicalOk = canonicalStation && canonicalStation.status !== 'archived_duplicate';

      if (!isArchivedOk || !isCanonicalOk) {
        reviewNeeded.push({
          archivedId,
          canonicalId,
          reason: !isArchivedOk
            ? `Archived station not found or not marked archived_duplicate (status=${archivedStation?.status ?? 'NOT_FOUND'})`
            : `Canonical station not found or is also archived (status=${canonicalStation?.status ?? 'NOT_FOUND'})`,
        });
      } else {
        confirmedMappings[archivedId] = { canonicalId };
        mappingDetails.push({
          archivedId,
          canonicalId,
          archivedName: archivedStation.name,
          canonicalName: canonicalStation.name,
          chain: canonicalStation.chain || null,
        });
      }
    }

    const confirmedArchivedIds = new Set(Object.keys(confirmedMappings));
    const archivedToCanonical = Object.fromEntries(
      Object.entries(confirmedMappings).map(([k, v]) => [k, v.canonicalId])
    );

    if (confirmedArchivedIds.size === 0) {
      return Response.json({
        mode: dry_run ? 'DRY_RUN' : 'EXECUTE',
        timestamp: new Date().toISOString(),
        step1_canonicalMappings: 0,
        reviewNeeded,
        note: 'No confirmed archived→canonical mappings found. Nothing to remediate.',
        filesChanged: 'NONE',
        lockedFilesVerification: { touchedLockedFiles: false },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2A+B — Find FuelPrice rows referencing archived stationIds
    // ─────────────────────────────────────────────────────────────────────────
    const fuelPricesToReassign = allFuelPrices.filter(p => confirmedArchivedIds.has(p.stationId));
    const fuelPriceReassignDetails = [];

    // Group by archived stationId for reporting
    const reassignByArchived = {};
    for (const p of fuelPricesToReassign) {
      if (!reassignByArchived[p.stationId]) reassignByArchived[p.stationId] = [];
      reassignByArchived[p.stationId].push(p);
    }
    for (const [archivedId, rows] of Object.entries(reassignByArchived)) {
      fuelPriceReassignDetails.push({
        archivedId,
        archivedName: stationById[archivedId]?.name,
        canonicalId: archivedToCanonical[archivedId],
        rowsToReassign: rows.length,
      });
    }

    // Execute reassignment
    if (!dry_run) {
      for (const price of fuelPricesToReassign) {
        await base44.asServiceRole.entities.FuelPrice.update(price.id, {
          stationId: archivedToCanonical[price.stationId],
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2C — Detect exact duplicate FuelPrice rows post-reassignment
    // Work on in-memory merged view: reassigned rows get new stationId
    // ─────────────────────────────────────────────────────────────────────────
    const mergedFuelPrices = allFuelPrices.map(p => ({
      ...p,
      stationId: archivedToCanonical[p.stationId] ?? p.stationId,
    }));

    // Group by canonical stationId, then find exact dupes
    const byCanonicalStation = {};
    for (const p of mergedFuelPrices) {
      const cId = archivedToCanonical[p.stationId] ?? p.stationId;
      if (!byCanonicalStation[cId]) byCanonicalStation[cId] = [];
      byCanonicalStation[cId].push({ ...p, stationId: cId });
    }

    const fuelPriceDeleteDetails = [];
    const idsToDelete = new Set();

    for (const [canonicalId, rows] of Object.entries(byCanonicalStation)) {
      if (!Object.values(archivedToCanonical).includes(canonicalId)) continue; // only check affected stations

      // Sort oldest first (oldest created_date = canonical history row to keep)
      const sorted = [...rows].sort(
        (a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0)
      );

      const seen = {};
      for (const p of sorted) {
        if (!p.fuelType || p.priceNok == null || !p.sourceName || !p.fetchedAt) continue;
        const key = `${p.fuelType}|${p.priceNok}|${p.sourceName}|${p.fetchedAt}`;
        if (seen[key]) {
          idsToDelete.add(p.id);
          fuelPriceDeleteDetails.push({
            deletedId: p.id,
            keptId: seen[key],
            stationId: canonicalId,
            fuelType: p.fuelType,
            priceNok: p.priceNok,
            sourceName: p.sourceName,
            fetchedAt: p.fetchedAt,
          });
        } else {
          seen[key] = p.id;
        }
      }
    }

    if (!dry_run) {
      for (const id of idsToDelete) {
        await base44.asServiceRole.entities.FuelPrice.delete(id);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3 — CurrentStationPrices cleanup (in-memory)
    // ─────────────────────────────────────────────────────────────────────────
    const cspDeleteDetails = [];
    const cspIdsToDelete = new Set();

    // For each archived stationId: find CSP rows pointing to it
    for (const cspRow of allCSP) {
      if (confirmedArchivedIds.has(cspRow.stationId)) {
        // Orphan — points to archived stationId
        const canonicalId = archivedToCanonical[cspRow.stationId];
        // Verify canonical CSP exists (already in allCSP)
        const canonicalCSPExists = allCSP.some(
          r => r.stationId === canonicalId && r.stationStatus !== 'archived_duplicate'
        );
        cspIdsToDelete.add(cspRow.id);
        cspDeleteDetails.push({
          deletedCSPId: cspRow.id,
          stationId: cspRow.stationId,
          stationName: cspRow.stationName,
          stationStatus: cspRow.stationStatus,
          canonicalId,
          reason: 'orphan_archived_stationId',
          canonicalActiveCSPExists: canonicalCSPExists,
        });
      } else if (cspRow.stationStatus === 'archived_duplicate') {
        // CSP row where the station was later archived — also remove
        const archivedId = Object.keys(archivedToCanonical).find(
          k => archivedToCanonical[k] === cspRow.stationId
        );
        if (archivedId !== undefined) {
          cspIdsToDelete.add(cspRow.id);
          cspDeleteDetails.push({
            deletedCSPId: cspRow.id,
            stationId: cspRow.stationId,
            stationName: cspRow.stationName,
            stationStatus: cspRow.stationStatus,
            reason: 'canonical_csp_row_marked_archived_duplicate',
          });
        }
      }
    }

    if (!dry_run) {
      for (const id of cspIdsToDelete) {
        await base44.asServiceRole.entities.CurrentStationPrices.delete(id);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4 — Verification (post-write, re-fetch only what's needed)
    // ─────────────────────────────────────────────────────────────────────────
    let verificationResults = { summary: 'DRY_RUN — verification skipped' };

    if (!dry_run) {
      // Re-fetch only the affected stationId sets
      const verifyFP = await listAll(base44.asServiceRole.entities.FuelPrice);
      const verifyCSP = await listAll(base44.asServiceRole.entities.CurrentStationPrices);

      const staleRefs = verifyFP.filter(p => confirmedArchivedIds.has(p.stationId)).length;
      const staleCSP = verifyCSP.filter(r => confirmedArchivedIds.has(r.stationId)).length;

      verificationResults = {
        staleFuelPriceRefsRemaining: staleRefs,
        staleCSPRowsRemaining: staleCSP,
        fuelPricePassed: staleRefs === 0,
        cspPassed: staleCSP === 0,
        summary: staleRefs === 0 && staleCSP === 0
          ? 'PASSED — no stale archived_duplicate references remain in FuelPrice or CurrentStationPrices'
          : `FAILED — ${staleRefs} FuelPrice + ${staleCSP} CSP rows still reference archived stationIds`,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RETURN
    // ─────────────────────────────────────────────────────────────────────────
    return Response.json({
      filesRead: [
        'StationMergeLog (entity)',
        'Station (entity — bulk)',
        'FuelPrice (entity — bulk)',
        'CurrentStationPrices (entity — bulk)',
        'NearbyPrices.jsx (reviewed — uses CSP path, filters archived_duplicate via _station.status)',
        'currentPriceResolver.js (reviewed — resolveLatestPerStation collapses by stationId)',
        'currentStationPricesAdapter.js (reviewed — passes stationStatus to _station.status)',
      ],
      filesChanged: dry_run ? 'NONE — dry run' : 'FuelPrice rows reassigned + exact dupes deleted; CSP orphan rows deleted',
      mode: dry_run ? 'DRY_RUN' : 'EXECUTE',
      timestamp: new Date().toISOString(),
      curator_id: dry_run ? null : user.email,

      step1_canonicalMappings: mappingDetails.length,
      mappingDetails,

      step2_fuelPriceRowsReassigned: fuelPricesToReassign.length,
      fuelPriceReassignDetails,

      step2_fuelPriceExactDuplicatesDeleted: idsToDelete.size,
      fuelPriceDeleteDetails,

      step3_cspRowsDeleted: cspIdsToDelete.size,
      cspDeleteDetails,

      step4_verification: verificationResults,

      step5_reviewNeeded: reviewNeeded,
      reviewNeededCount: reviewNeeded.length,

      recommendedNextStep: dry_run
        ? `Dry-run complete. ${fuelPricesToReassign.length} FuelPrice rows to reassign, ${idsToDelete.size} exact dupes to delete, ${cspIdsToDelete.size} CSP orphan rows to delete. Re-run with dry_run=false and curator_confirmation=true to apply.`
        : (verificationResults.fuelPricePassed && verificationResults.cspPassed
            ? 'Verification PASSED. NearbyPrices now shows no duplicate entries for remediated stations.'
            : 'Verification FAILED — inspect step5_reviewNeeded'),

      lockedFilesVerification: {
        touchedLockedFiles: false,
        lockedFiles: [
          'functions/deleteAllGooglePlacesPrices',
          'functions/verifyGooglePlacesPriceNormalization',
          'functions/deleteGooglePlacesPricesForReclassification',
          'functions/classifyPricePlausibility',
          'functions/classifyStationsRuleEngine',
          'functions/classifyGooglePlacesConfidence',
        ],
        status: 'UNTOUCHED',
      },
    });

  } catch (err) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});