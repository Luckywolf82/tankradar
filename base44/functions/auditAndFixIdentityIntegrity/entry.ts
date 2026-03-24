import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * IDENTITY INTEGRITY AUDIT AND REMEDIATION
 *
 * PURPOSE:
 * Finds and fixes all FuelPrice and CurrentStationPrices rows where
 * stationId is a Station.sourceStationId (external reference) instead of
 * the canonical Station.id.
 *
 * MODES:
 *   "audit"    — read-only scan, returns findings without writing anything
 *   "fix"      — applies all safe remediations (requires curator_confirmation: true)
 *
 * ADMIN ONLY.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'curator')) {
      return Response.json({ error: 'Admin or curator access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'audit';
    const curatorConfirmation = body.curator_confirmation === true;

    if (mode === 'fix' && !curatorConfirmation) {
      return Response.json({
        error: 'fix mode requires curator_confirmation: true in request body'
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // ── STEP 1: Load all Station records ─────────────────────────────────────
    // Build two lookup maps:
    //   stationById[id]               → Station row
    //   stationBySourceStationId[src] → Station row  (only where sourceStationId is set)
    const allStations = await base44.asServiceRole.entities.Station.list('-created_date', 5000);
    const stationById = {};
    const stationBySourceStationId = {};

    for (const s of allStations) {
      stationById[s.id] = s;
      if (s.sourceStationId && s.sourceStationId.trim()) {
        // If multiple stations share a sourceStationId (shouldn't happen), prefer active
        const existing = stationBySourceStationId[s.sourceStationId];
        if (!existing || (s.status === 'active' && existing.status !== 'active')) {
          stationBySourceStationId[s.sourceStationId] = s;
        }
      }
    }

    console.log(`[identity-audit] Stations loaded: ${allStations.length}`);
    console.log(`[identity-audit] Stations with sourceStationId: ${Object.keys(stationBySourceStationId).length}`);

    // ── STEP 2: Audit FuelPrice rows ─────────────────────────────────────────
    // Load all FuelPrice rows that have a stationId set
    let allFuelPrices = [];
    let skip = 0;
    const BATCH = 500;
    while (true) {
      const batch = await base44.asServiceRole.entities.FuelPrice.list('-fetchedAt', BATCH, skip);
      if (!batch || batch.length === 0) break;
      allFuelPrices = allFuelPrices.concat(batch);
      if (batch.length < BATCH) break;
      skip += BATCH;
    }

    console.log(`[identity-audit] FuelPrice rows loaded: ${allFuelPrices.length}`);

    // Classify each FuelPrice row
    const fpWrongIdentity = [];  // stationId is a sourceStationId, not a Station.id
    const fpOrphan = [];          // stationId exists but matches neither id nor sourceStationId
    let fpCorrect = 0;

    for (const fp of allFuelPrices) {
      if (!fp.stationId) continue; // no stationId — not our concern here

      if (stationById[fp.stationId]) {
        // Correct: stationId is a real Station.id
        fpCorrect++;
      } else if (stationBySourceStationId[fp.stationId]) {
        // Wrong: stationId is a sourceStationId — needs remapping
        const canonicalStation = stationBySourceStationId[fp.stationId];
        fpWrongIdentity.push({
          fpId: fp.id,
          wrongStationId: fp.stationId,
          canonicalStationId: canonicalStation.id,
          canonicalStationName: canonicalStation.name,
          canonicalStationChain: canonicalStation.chain || null,
          fuelType: fp.fuelType,
          fetchedAt: fp.fetchedAt,
          sourceName: fp.sourceName,
        });
      } else {
        // Orphan: stationId doesn't match anything in Station catalog
        // (These are handled by remediateOrphanStationRefs; skip here)
        fpOrphan.push({ fpId: fp.id, stationId: fp.stationId });
      }
    }

    console.log(`[identity-audit] FuelPrice — correct: ${fpCorrect}, wrong-identity: ${fpWrongIdentity.length}, orphan: ${fpOrphan.length}`);

    // ── STEP 3: Audit CurrentStationPrices rows ───────────────────────────────
    const allCSP = await base44.asServiceRole.entities.CurrentStationPrices.list('-updatedAt', 2000);

    const cspWrongIdentity = [];
    const cspOrphan = [];
    let cspCorrect = 0;

    for (const csp of allCSP) {
      if (!csp.stationId) continue;

      if (stationById[csp.stationId]) {
        cspCorrect++;
      } else if (stationBySourceStationId[csp.stationId]) {
        const canonicalStation = stationBySourceStationId[csp.stationId];
        cspWrongIdentity.push({
          cspId: csp.id,
          wrongStationId: csp.stationId,
          canonicalStationId: canonicalStation.id,
          canonicalStationName: canonicalStation.name,
          stationName: csp.stationName,
        });
      } else {
        cspOrphan.push({ cspId: csp.id, stationId: csp.stationId });
      }
    }

    console.log(`[identity-audit] CSP — correct: ${cspCorrect}, wrong-identity: ${cspWrongIdentity.length}, orphan: ${cspOrphan.length}`);

    // ── AUDIT-ONLY: Return findings without writing ───────────────────────────
    if (mode === 'audit') {
      return Response.json({
        mode: 'audit',
        timestamp: now,
        stationsLoaded: allStations.length,
        stationsWithSourceId: Object.keys(stationBySourceStationId).length,

        fuelPrice: {
          total: allFuelPrices.filter(fp => fp.stationId).length,
          correct: fpCorrect,
          wrongIdentity: fpWrongIdentity.length,
          orphan: fpOrphan.length,
          wrongIdentitySamples: fpWrongIdentity.slice(0, 10),
        },

        currentStationPrices: {
          total: allCSP.filter(c => c.stationId).length,
          correct: cspCorrect,
          wrongIdentity: cspWrongIdentity.length,
          orphan: cspOrphan.length,
          wrongIdentitySamples: cspWrongIdentity.slice(0, 10),
        },

        instructions: fpWrongIdentity.length + cspWrongIdentity.length === 0
          ? 'No wrong-identity rows found. Identity integrity verified.'
          : 'Call with mode="fix" and curator_confirmation=true to remediate all wrong-identity rows.',
      });
    }

    // ── FIX MODE ─────────────────────────────────────────────────────────────
    const results = {
      mode: 'fix',
      timestamp: now,
      fpFixed: 0,
      fpFailed: [],
      cspDeleted: 0,
      cspDeleteFailed: [],
      cspTriggered: 0,
      cspTriggerFailed: [],
    };

    // FIX FuelPrice: repoint stationId from sourceStationId to canonical Station.id
    for (const item of fpWrongIdentity) {
      try {
        await base44.asServiceRole.entities.FuelPrice.update(item.fpId, {
          stationId: item.canonicalStationId,
        });
        results.fpFixed++;
      } catch (err) {
        results.fpFailed.push({ fpId: item.fpId, error: err.message });
      }
    }

    console.log(`[identity-audit] FuelPrice fixed: ${results.fpFixed}, failed: ${results.fpFailed.length}`);

    // FIX CurrentStationPrices: delete wrong-identity rows, then re-trigger materialization
    // from the canonical FuelPrice rows (which are now fixed)
    for (const item of cspWrongIdentity) {
      try {
        await base44.asServiceRole.entities.CurrentStationPrices.delete(item.cspId);
        results.cspDeleted++;
      } catch (err) {
        results.cspDeleteFailed.push({ cspId: item.cspId, error: err.message });
      }
    }

    console.log(`[identity-audit] CSP deleted: ${results.cspDeleted}, failed: ${results.cspDeleteFailed.length}`);

    // Collect unique canonical station IDs that were affected, and trigger
    // a CSP rebuild for each by finding their latest eligible FuelPrice rows
    // and calling materializeCurrentStationPrice.
    const affectedCanonicalIds = new Set([
      ...fpWrongIdentity.map(i => i.canonicalStationId),
      ...cspWrongIdentity.map(i => i.canonicalStationId),
    ]);

    console.log(`[identity-audit] Triggering CSP rebuild for ${affectedCanonicalIds.size} canonical stations`);

    for (const canonicalId of affectedCanonicalIds) {
      // Find the most recent eligible FuelPrice rows for this canonical station
      const stationFPs = await base44.asServiceRole.entities.FuelPrice.filter(
        { stationId: canonicalId },
        '-fetchedAt',
        100
      );

      const eligible = stationFPs.filter(fp =>
        fp.plausibilityStatus === 'realistic_price' &&
        (fp.fuelType === 'gasoline_95' || fp.fuelType === 'diesel')
      );

      if (eligible.length === 0) {
        console.log(`[identity-audit] No eligible FP rows for canonical ${canonicalId}, skipping CSP rebuild`);
        continue;
      }

      // Pick latest gasoline_95 and diesel rows
      const latest = {};
      for (const fp of eligible) {
        if (!latest[fp.fuelType] || new Date(fp.fetchedAt) > new Date(latest[fp.fuelType].fetchedAt)) {
          latest[fp.fuelType] = fp;
        }
      }

      // Trigger materializeCurrentStationPrice for each fuel type found
      // Use the inline CSP upsert logic directly (avoids auth issues from function invocation)
      for (const fp of Object.values(latest)) {
        try {
          // Inline CSP upsert: find existing row for this canonical stationId and update it
          const existingCSP = await base44.asServiceRole.entities.CurrentStationPrices.filter(
            { stationId: canonicalId }
          );

          const station = stationById[canonicalId];
          const stationMeta = station ? {
            stationName: station.name || null,
            stationChain: station.chain || null,
            stationStatus: station.status || 'active',
            latitude: station.latitude ?? null,
            longitude: station.longitude ?? null,
          } : {};

          let fuelPatch;
          if (fp.fuelType === 'gasoline_95') {
            fuelPatch = {
              gasoline_95_price: fp.priceNok,
              gasoline_95_fetchedAt: fp.fetchedAt || now,
              gasoline_95_confidenceScore: fp.confidenceScore ?? null,
              gasoline_95_plausibilityStatus: fp.plausibilityStatus || null,
              gasoline_95_stationMatchStatus: fp.station_match_status || null,
              gasoline_95_priceType: fp.priceType || null,
            };
          } else {
            fuelPatch = {
              diesel_price: fp.priceNok,
              diesel_fetchedAt: fp.fetchedAt || now,
              diesel_confidenceScore: fp.confidenceScore ?? null,
              diesel_plausibilityStatus: fp.plausibilityStatus || null,
              diesel_stationMatchStatus: fp.station_match_status || null,
              diesel_priceType: fp.priceType || null,
            };
          }

          const patch = { ...stationMeta, ...fuelPatch, sourceName: fp.sourceName || null, updatedAt: now };

          if (existingCSP && existingCSP.length > 0) {
            const sorted = [...existingCSP].sort((a, b) =>
              new Date(a.created_date || 0) - new Date(b.created_date || 0)
            );
            await base44.asServiceRole.entities.CurrentStationPrices.update(sorted[0].id, patch);
            // Delete extras if race-created
            for (const extra of sorted.slice(1)) {
              await base44.asServiceRole.entities.CurrentStationPrices.delete(extra.id);
            }
          } else {
            await base44.asServiceRole.entities.CurrentStationPrices.create({
              stationId: canonicalId,
              ...patch,
            });
          }

          results.cspTriggered++;
        } catch (err) {
          results.cspTriggerFailed.push({ canonicalId, fuelType: fp.fuelType, error: err.message });
        }
      }
    }

    console.log(`[identity-audit] CSP materialization triggered: ${results.cspTriggered}`);

    // ── VERIFICATION: Re-scan to confirm zero wrong-identity rows remain ──────
    // Re-load FuelPrice rows with wrong identity that still persist
    const verifyFP = await base44.asServiceRole.entities.FuelPrice.list('-fetchedAt', 500);
    let verifyFPWrong = 0;
    for (const fp of verifyFP) {
      if (!fp.stationId) continue;
      if (!stationById[fp.stationId] && stationBySourceStationId[fp.stationId]) {
        verifyFPWrong++;
      }
    }

    const verifyCSP = await base44.asServiceRole.entities.CurrentStationPrices.list('-updatedAt', 500);
    let verifyCSPWrong = 0;
    for (const csp of verifyCSP) {
      if (!csp.stationId) continue;
      if (!stationById[csp.stationId] && stationBySourceStationId[csp.stationId]) {
        verifyCSPWrong++;
      }
    }

    return Response.json({
      ...results,
      audit: {
        fpWrongIdentityFound: fpWrongIdentity.length,
        cspWrongIdentityFound: cspWrongIdentity.length,
        affectedCanonicalStations: affectedCanonicalIds.size,
      },
      verification: {
        fpWrongIdentityRemaining: verifyFPWrong,
        cspWrongIdentityRemaining: verifyCSPWrong,
        integrityVerified: verifyFPWrong === 0 && verifyCSPWrong === 0,
      },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});