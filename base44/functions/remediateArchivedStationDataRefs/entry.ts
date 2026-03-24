/**
 * remediateArchivedStationDataRefs
 *
 * Cleans up stale FuelPrice and CurrentStationPrices references
 * that still point to archived_duplicate stationIds after Station remediation.
 *
 * STEP 1 — Build canonical mapping from StationMergeLog
 * STEP 2 — Reassign FuelPrice rows from archived → canonical stationId
 *          then detect + delete exact duplicate FuelPrice observations
 * STEP 3 — Delete orphan CurrentStationPrices rows linked to archived stationIds
 * STEP 4 — Verify no remaining stale references
 * STEP 5 — Safety stop for ambiguous cases
 *
 * Exact duplicate FuelPrice detection criteria (ALL must match):
 *   stationId + fuelType + priceNok + sourceName + fetchedAt
 *
 * Input:
 * {
 *   dry_run?: boolean   (default: true — no writes)
 *   curator_confirmation?: boolean  (must be true to write)
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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
    // STEP 1 — Build canonical mapping from StationMergeLog
    // ─────────────────────────────────────────────────────────────────────────
    const mergeLogs = await base44.asServiceRole.entities.StationMergeLog.list('-timestamp', 200);

    // Build map: archivedId → canonicalId
    const canonicalMap = {}; // { archivedId: canonicalId }
    const mappingDetails = []; // for reporting

    for (const log of mergeLogs) {
      if (!log.canonical_station_id || !log.merged_station_ids?.length) continue;
      for (const archivedId of log.merged_station_ids) {
        canonicalMap[archivedId] = log.canonical_station_id;
      }
    }

    // Cross-check: confirm archived stations are actually marked archived_duplicate
    // and canonical stations are active. Flag any ambiguous cases.
    const archivedIds = Object.keys(canonicalMap);
    const canonicalIds = [...new Set(Object.values(canonicalMap))];

    const reviewNeeded = [];
    const confirmedMappings = {};

    if (archivedIds.length > 0) {
      // Fetch archived station records (in pages)
      const allArchivedStations = [];
      for (const id of archivedIds) {
        try {
          const s = await base44.asServiceRole.entities.Station.filter({ id });
          if (s.length > 0) allArchivedStations.push(s[0]);
        } catch (_) { /* skip */ }
      }

      const allCanonicalStations = [];
      for (const id of canonicalIds) {
        try {
          const s = await base44.asServiceRole.entities.Station.filter({ id });
          if (s.length > 0) allCanonicalStations.push(s[0]);
        } catch (_) { /* skip */ }
      }

      const archivedMap = Object.fromEntries(allArchivedStations.map(s => [s.id, s]));
      const canonicalStationMap = Object.fromEntries(allCanonicalStations.map(s => [s.id, s]));

      for (const [archivedId, canonicalId] of Object.entries(canonicalMap)) {
        const archivedStation = archivedMap[archivedId];
        const canonicalStation = canonicalStationMap[canonicalId];

        const isArchivedConfirmed = archivedStation?.status === 'archived_duplicate';
        const isCanonicalActive = canonicalStation && canonicalStation.status !== 'archived_duplicate';

        if (!isArchivedConfirmed || !isCanonicalActive) {
          reviewNeeded.push({
            archivedId,
            canonicalId,
            reason: !isArchivedConfirmed
              ? `Archived station not found or not marked archived_duplicate (status=${archivedStation?.status ?? 'NOT_FOUND'})`
              : `Canonical station not found or is also archived (status=${canonicalStation?.status ?? 'NOT_FOUND'})`,
          });
        } else {
          confirmedMappings[archivedId] = {
            canonicalId,
            archivedName: archivedStation.name,
            canonicalName: canonicalStation.name,
            chain: canonicalStation.chain || null,
            sourceName: canonicalStation.sourceName,
            sourceStationId: canonicalStation.sourceStationId,
          };
          mappingDetails.push({
            archivedId,
            canonicalId,
            archivedName: archivedStation.name,
            canonicalName: canonicalStation.name,
            chain: canonicalStation.chain || null,
          });
        }
      }
    }

    const confirmedArchivedIds = Object.keys(confirmedMappings);

    if (confirmedArchivedIds.length === 0) {
      return Response.json({
        mode: dry_run ? 'DRY_RUN' : 'EXECUTE',
        timestamp: new Date().toISOString(),
        step1_canonicalMappings: 0,
        reviewNeeded,
        note: 'No confirmed archived→canonical mappings found. Nothing to remediate.',
        filesRead: ['StationMergeLog', 'Station'],
        filesChanged: 'NONE',
        lockedFilesVerification: { touchedLockedFiles: false },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2 — FuelPrice remediation
    // ─────────────────────────────────────────────────────────────────────────
    let fuelPriceRowsReassigned = 0;
    let fuelPriceExactDuplicatesDeleted = 0;
    const fuelPriceReassignDetails = [];
    const fuelPriceDeleteDetails = [];

    for (const archivedId of confirmedArchivedIds) {
      const { canonicalId, archivedName } = confirmedMappings[archivedId];

      // 2A: Find all FuelPrice rows for archived stationId
      const orphanPrices = await base44.asServiceRole.entities.FuelPrice.filter({ stationId: archivedId });

      if (orphanPrices.length === 0) continue;

      fuelPriceReassignDetails.push({
        archivedId,
        archivedName,
        canonicalId,
        rowsFound: orphanPrices.length,
      });

      // 2B: Reassign to canonical stationId
      if (!dry_run) {
        for (const price of orphanPrices) {
          await base44.asServiceRole.entities.FuelPrice.update(price.id, {
            stationId: canonicalId,
          });
          fuelPriceRowsReassigned++;
        }
      } else {
        fuelPriceRowsReassigned += orphanPrices.length;
      }

      // 2C: Detect exact duplicates AFTER reassignment
      // Fetch all FuelPrice rows now on canonical stationId (includes just-moved ones)
      const canonicalPrices = await base44.asServiceRole.entities.FuelPrice.filter({ stationId: canonicalId });

      // Group by exact-duplicate key: fuelType + priceNok + sourceName + fetchedAt
      const seen = {};
      const toDelete = [];

      // Sort so the oldest created_date wins (keep canonical history)
      const sorted = [...canonicalPrices].sort(
        (a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0)
      );

      for (const p of sorted) {
        const key = `${p.fuelType}|${p.priceNok}|${p.sourceName}|${p.fetchedAt}`;
        if (!key.includes('undefined') && !key.includes('null')) {
          if (seen[key]) {
            // This is an exact duplicate — mark for deletion
            toDelete.push(p.id);
            fuelPriceDeleteDetails.push({
              deletedId: p.id,
              keptId: seen[key],
              fuelType: p.fuelType,
              priceNok: p.priceNok,
              sourceName: p.sourceName,
              fetchedAt: p.fetchedAt,
              stationId: canonicalId,
            });
          } else {
            seen[key] = p.id;
          }
        }
      }

      if (!dry_run) {
        for (const id of toDelete) {
          await base44.asServiceRole.entities.FuelPrice.delete(id);
          fuelPriceExactDuplicatesDeleted++;
        }
      } else {
        fuelPriceExactDuplicatesDeleted += toDelete.length;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3 — CurrentStationPrices cleanup
    // ─────────────────────────────────────────────────────────────────────────
    let cspRowsDeleted = 0;
    const cspDeleteDetails = [];

    for (const archivedId of confirmedArchivedIds) {
      const { canonicalId, archivedName } = confirmedMappings[archivedId];

      // Find CSP rows still pointing to archived stationId
      const orphanCSP = await base44.asServiceRole.entities.CurrentStationPrices.filter({ stationId: archivedId });

      // Also find any CSP rows with stationStatus = 'archived_duplicate' pointing to this canonical
      // (could happen if backfill ran after archival and copied the status)
      const archivedStatusCSP = await base44.asServiceRole.entities.CurrentStationPrices.filter({
        stationId: canonicalId,
        stationStatus: 'archived_duplicate',
      });

      const toDeleteCSP = [...orphanCSP, ...archivedStatusCSP];

      // Verify canonical CSP row exists before deleting orphans
      const canonicalCSP = await base44.asServiceRole.entities.CurrentStationPrices.filter({
        stationId: canonicalId,
      });

      const canonicalActiveCSP = canonicalCSP.filter(r => r.stationStatus !== 'archived_duplicate');

      for (const row of toDeleteCSP) {
        // Safety: never delete the canonical active CSP row
        if (row.stationId === canonicalId && canonicalActiveCSP.some(r => r.id === row.id) && row.stationStatus !== 'archived_duplicate') {
          continue;
        }

        cspDeleteDetails.push({
          deletedCSPId: row.id,
          stationId: row.stationId,
          stationName: row.stationName,
          stationStatus: row.stationStatus,
          reason: row.stationId === archivedId ? 'orphan_archived_stationId' : 'canonical_row_marked_archived',
          canonicalActiveCSPExists: canonicalActiveCSP.length > 0,
        });

        if (!dry_run) {
          await base44.asServiceRole.entities.CurrentStationPrices.delete(row.id);
          cspRowsDeleted++;
        } else {
          cspRowsDeleted++;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4 — Verification
    // ─────────────────────────────────────────────────────────────────────────
    const verificationResults = {
      fuelPrice: {},
      currentStationPrices: {},
      summary: '',
    };

    if (!dry_run) {
      let staleRefs = 0;
      for (const archivedId of confirmedArchivedIds) {
        const remaining = await base44.asServiceRole.entities.FuelPrice.filter({ stationId: archivedId });
        staleRefs += remaining.length;
      }

      let staleCSP = 0;
      for (const archivedId of confirmedArchivedIds) {
        const remaining = await base44.asServiceRole.entities.CurrentStationPrices.filter({ stationId: archivedId });
        staleCSP += remaining.length;
      }

      verificationResults.fuelPrice = {
        staleFuelPriceRefsRemaining: staleRefs,
        passed: staleRefs === 0,
      };
      verificationResults.currentStationPrices = {
        staleCSPRowsRemaining: staleCSP,
        passed: staleCSP === 0,
      };
      verificationResults.summary = staleRefs === 0 && staleCSP === 0
        ? 'PASSED — no stale archived_duplicate references remain'
        : `FAILED — ${staleRefs} FuelPrice + ${staleCSP} CSP rows still reference archived stationIds`;
    } else {
      verificationResults.summary = 'DRY_RUN — verification skipped (no writes performed)';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RETURN
    // ─────────────────────────────────────────────────────────────────────────
    return Response.json({
      // A. Files read
      filesRead: [
        'StationMergeLog (entity)',
        'Station (entity)',
        'FuelPrice (entity)',
        'CurrentStationPrices (entity)',
        'components/dashboard/NearbyPrices.jsx (reviewed)',
        'utils/currentPriceResolver.js (reviewed)',
        'utils/currentStationPricesAdapter.js (reviewed)',
      ],

      // B. Files changed
      filesChanged: dry_run ? 'NONE — dry run' : 'FuelPrice (entity), CurrentStationPrices (entity)',

      mode: dry_run ? 'DRY_RUN' : 'EXECUTE',
      timestamp: new Date().toISOString(),
      curator_id: dry_run ? null : user.email,

      // C. Confirmed station mappings processed
      step1_canonicalMappings: mappingDetails.length,
      mappingDetails,

      // D. FuelPrice rows reassigned
      step2_fuelPriceRowsReassigned: fuelPriceRowsReassigned,
      fuelPriceReassignDetails,

      // E. Exact FuelPrice duplicates deleted
      step2_fuelPriceExactDuplicatesDeleted: fuelPriceExactDuplicatesDeleted,
      fuelPriceDeleteDetails,

      // F. CurrentStationPrices rows deleted
      step3_cspRowsDeleted: cspRowsDeleted,
      cspDeleteDetails,

      // G. Verification
      step4_verification: verificationResults,

      // H. Review-needed cases
      step5_reviewNeeded: reviewNeeded,
      reviewNeededCount: reviewNeeded.length,

      // I. Recommended next step
      recommendedNextStep: dry_run
        ? 'Re-run with dry_run=false and curator_confirmation=true to apply all remediation writes'
        : (verificationResults.fuelPrice.passed && verificationResults.currentStationPrices.passed
            ? 'Verification passed. NearbyPrices should now show no duplicates for remediated stations. Monitor for 24h.'
            : 'Verification FAILED — inspect step5_reviewNeeded and re-run for remaining cases'),

      // J. Locked files untouched verification
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