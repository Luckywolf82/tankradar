/**
 * remediateOrphanStationRefs
 *
 * DATA REMEDIATION — Admin only.
 *
 * ROOT CAUSE (confirmed 2026-03-24):
 * Before station matching was tightened, GooglePlaces fetches wrote FuelPrice rows
 * using the GooglePlaces place ID as stationId directly (e.g. "69ac9dedd5092deeaa78e30d"),
 * even though that place ID was never a Station entity in the catalog.
 *
 * The correct canonical Station was later created (OSM-sourced), and the GooglePlaces
 * fetcher was patched to match against real Station IDs. However, old FuelPrice and
 * CurrentStationPrices rows were never cleaned up.
 *
 * This function handles orphan stationId references — i.e. stationIds on FuelPrice or
 * CurrentStationPrices that have NO corresponding Station entity.
 *
 * Resolution strategy:
 *   - For each orphan stationId found, look up the canonical Station by spatial proximity
 *     and name matching (GPS lat/lon embedded in the FuelPrice row → nearest Station record)
 *   - If a confident match is found (same name + chain, distance < 100m): re-point
 *   - If no confident match: flag as unresolvable, leave in place, report
 *
 * SAFETY:
 *   - Admin-only.
 *   - dry_run: true to preview without writing.
 *   - curator_confirmation: true required for writes.
 *   - Does not touch Station catalog, matching engine, or Phase 2 functions.
 *   - Idempotent.
 *
 * Payload: { curator_confirmation: true, dry_run?: boolean }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const R_EARTH = 6371;

function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Throttle: wait ms milliseconds */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9æøå]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Score candidate station match.
 * Returns { score, reason } where score >= 2 is a confident match.
 *
 * Scoring:
 *  +2 if distance < 0.05 km (50 m)
 *  +1 if distance < 0.1 km (100 m)
 *  +2 if normalized station_name overlaps meaningfully
 *  +1 if chain matches
 */
function scoreCandidate(stationName, stationChain, stationLat, stationLon, candidate) {
  let score = 0;
  const reasons = [];

  const dist = haversineKm(stationLat, stationLon, candidate.latitude, candidate.longitude);
  if (dist < 0.05) {
    score += 2;
    reasons.push(`dist=${(dist * 1000).toFixed(0)}m`);
  } else if (dist < 0.1) {
    score += 1;
    reasons.push(`dist=${(dist * 1000).toFixed(0)}m`);
  } else {
    reasons.push(`dist=${(dist * 1000).toFixed(0)}m(too_far)`);
    return { score: -1, dist, reason: reasons.join(', ') }; // hard reject beyond 100m
  }

  const normName = normalize(stationName);
  const normCandidate = normalize(candidate.name);
  if (normName && normCandidate && (normName.includes(normCandidate) || normCandidate.includes(normName))) {
    score += 2;
    reasons.push('name_match');
  }

  const normChain = normalize(stationChain);
  const normCandChain = normalize(candidate.chain);
  if (normChain && normCandChain && normChain === normCandChain) {
    score += 1;
    reasons.push('chain_match');
  }

  return { score, dist, reason: reasons.join(', ') };
}

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
      orphanStationIds: [],
      resolvedMappings: [],
      unresolvedOrphans: [],
      fuelPriceRepointed: 0,
      cspDeleted: 0,
      cspRebuilt: 0,
      errors: [],
    };

    // ── Load Station catalog (active only for matching targets) ───────────────
    const allStations = await base44.asServiceRole.entities.Station.list();
    const stationById = {};
    for (const s of allStations) stationById[s.id] = s;

    const activeStations = allStations.filter(
      (s) => s.status !== 'archived_duplicate' && s.latitude != null && s.longitude != null
    );

    // ── Load all CSP rows ─────────────────────────────────────────────────────
    const allCSP = await base44.asServiceRole.entities.CurrentStationPrices.list();

    // ── Find orphan stationIds in CSP ─────────────────────────────────────────
    const orphanCSP = allCSP.filter((row) => row.stationId && !stationById[row.stationId]);

    // Also check FuelPrice: group by orphan stationId
    // Load FuelPrice rows for each orphan CSP stationId (and also scan FuelPrices broadly)
    // Strategy: collect all unique stationIds from FuelPrice that aren't in Station catalog.
    // For efficiency, load FuelPrice in batches.
    const BATCH = 500;
    let allFP = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.FuelPrice.list('-fetchedAt', BATCH, skip);
      if (!batch || batch.length === 0) break;
      allFP = allFP.concat(batch);
      if (batch.length < BATCH) break;
      skip += BATCH;
    }

    const orphanFPByStationId = {};
    for (const fp of allFP) {
      if (!fp.stationId) continue;
      if (stationById[fp.stationId]) continue; // valid station — skip
      if (!orphanFPByStationId[fp.stationId]) orphanFPByStationId[fp.stationId] = [];
      orphanFPByStationId[fp.stationId].push(fp);
    }

    // Union of orphan stationIds from both CSP and FuelPrice
    const orphanCSPByStationId = {};
    for (const row of orphanCSP) {
      if (!orphanCSPByStationId[row.stationId]) orphanCSPByStationId[row.stationId] = [];
      orphanCSPByStationId[row.stationId].push(row);
    }

    const allOrphanIds = new Set([
      ...Object.keys(orphanCSPByStationId),
      ...Object.keys(orphanFPByStationId),
    ]);

    report.orphanStationIds = [...allOrphanIds];

    if (allOrphanIds.size === 0) {
      return Response.json({
        ...report,
        summary: 'No orphan stationIds found. All FuelPrice and CSP rows reference valid Station records.',
      });
    }

    // ── Attempt to resolve each orphan stationId ──────────────────────────────
    const resolvedMap = {}; // orphanId → canonicalStationId

    for (const orphanId of allOrphanIds) {
      // Gather representative GPS + name from FuelPrice rows for this orphanId
      const fpRows = orphanFPByStationId[orphanId] || [];
      const cspRows = orphanCSPByStationId[orphanId] || [];

      let lat = null;
      let lon = null;
      let stationName = null;
      let stationChain = null;

      // Prefer FuelPrice GPS data (most explicit)
      for (const fp of fpRows) {
        if (fp.gps_latitude != null && fp.gps_longitude != null) {
          lat = fp.gps_latitude;
          lon = fp.gps_longitude;
          stationName = fp.station_name;
          stationChain = fp.station_chain;
          break;
        }
      }

      // Fallback: use CSP lat/lon
      if (lat == null && cspRows.length > 0) {
        const c = cspRows[0];
        lat = c.latitude;
        lon = c.longitude;
        stationName = c.stationName;
        stationChain = c.stationChain;
      }

      if (lat == null || lon == null) {
        report.unresolvedOrphans.push({
          orphanId,
          reason: 'no_gps_available',
          fpRowCount: fpRows.length,
          cspRowCount: cspRows.length,
        });
        continue;
      }

      // Score all active stations as candidates
      let bestScore = -1;
      let bestCandidate = null;
      let bestReason = null;

      for (const candidate of activeStations) {
        const { score, reason } = scoreCandidate(stationName, stationChain, lat, lon, candidate);
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = candidate;
          bestReason = reason;
        }
      }

      // Require score >= 3 for confident match (distance < 100m + name OR chain match)
      if (bestScore >= 3 && bestCandidate) {
        resolvedMap[orphanId] = bestCandidate.id;
        report.resolvedMappings.push({
          orphanId,
          canonicalId: bestCandidate.id,
          canonicalName: bestCandidate.name,
          score: bestScore,
          reason: bestReason,
          fpRowCount: fpRows.length,
          cspRowCount: cspRows.length,
        });
      } else {
        report.unresolvedOrphans.push({
          orphanId,
          reason: 'no_confident_match',
          bestScore,
          bestCandidate: bestCandidate ? { id: bestCandidate.id, name: bestCandidate.name } : null,
          bestReason,
          stationName,
          lat,
          lon,
          fpRowCount: fpRows.length,
          cspRowCount: cspRows.length,
        });
      }
    }

    if (dryRun) {
      return Response.json({
        ...report,
        summary: `DRY RUN — ${Object.keys(resolvedMap).length} orphan stationId(s) would be resolved, ${report.unresolvedOrphans.length} unresolvable. No writes performed.`,
      });
    }

    // ── Execute: re-point FuelPrice rows ──────────────────────────────────────
    for (const [orphanId, canonicalId] of Object.entries(resolvedMap)) {
      const fpRows = orphanFPByStationId[orphanId] || [];
      for (const fp of fpRows) {
        try {
          await base44.asServiceRole.entities.FuelPrice.update(fp.id, { stationId: canonicalId });
          report.fuelPriceRepointed++;
        } catch (err) {
          report.errors.push({ type: 'fp_repoint_failed', fpId: fp.id, orphanId, error: err.message });
        }
      }
    }

    // ── Execute: delete orphan CSP rows ───────────────────────────────────────
    for (const [orphanId, canonicalId] of Object.entries(resolvedMap)) {
      const cspRows = orphanCSPByStationId[orphanId] || [];
      for (const row of cspRows) {
        try {
          await base44.asServiceRole.entities.CurrentStationPrices.delete(row.id);
          report.cspDeleted++;
        } catch (err) {
          report.errors.push({ type: 'csp_delete_failed', cspId: row.id, orphanId, error: err.message });
        }
      }
    }

    // ── Execute: rebuild/refresh canonical CSP for affected canonical stationIds ──
    const affectedCanonicals = new Set(Object.values(resolvedMap));

    for (const canonicalId of affectedCanonicals) {
      try {
        // Load all FuelPrice rows now pointing at this canonical station
        const allCanonicalFP = await base44.asServiceRole.entities.FuelPrice.filter({ stationId: canonicalId });
        const eligible = allCanonicalFP.filter(
          (fp) => fp.plausibilityStatus === 'realistic_price' &&
            (fp.fuelType === 'gasoline_95' || fp.fuelType === 'diesel')
        );

        let latestG95 = null;
        let latestDsl = null;
        for (const fp of eligible) {
          if (fp.fuelType === 'gasoline_95') {
            if (!latestG95 || new Date(fp.fetchedAt) > new Date(latestG95.fetchedAt)) latestG95 = fp;
          } else if (fp.fuelType === 'diesel') {
            if (!latestDsl || new Date(fp.fetchedAt) > new Date(latestDsl.fetchedAt)) latestDsl = fp;
          }
        }

        if (!latestG95 && !latestDsl) continue;

        // Station metadata
        const s = stationById[canonicalId];
        const stationMeta = s ? {
          stationName: s.name || null,
          stationChain: s.chain || null,
          stationStatus: s.status || 'active',
          latitude: s.latitude ?? null,
          longitude: s.longitude ?? null,
        } : {};

        const patch = { ...stationMeta, updatedAt: now };

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

        const existingCSP = await base44.asServiceRole.entities.CurrentStationPrices.filter({ stationId: canonicalId });
        if (existingCSP && existingCSP.length > 0) {
          await base44.asServiceRole.entities.CurrentStationPrices.update(existingCSP[0].id, patch);
        } else {
          await base44.asServiceRole.entities.CurrentStationPrices.create({ stationId: canonicalId, ...patch });
        }
        report.cspRebuilt++;
      } catch (err) {
        report.errors.push({ type: 'csp_rebuild_failed', canonicalId, error: err.message });
      }
    }

    // ── Final verification ────────────────────────────────────────────────────
    const finalCSP = await base44.asServiceRole.entities.CurrentStationPrices.list();
    const residualOrphanCSP = finalCSP.filter((r) => r.stationId && !stationById[r.stationId]);

    return Response.json({
      ...report,
      verification: {
        residual_orphan_csp_count: residualOrphanCSP.length,
        residual_orphan_csp_station_ids: residualOrphanCSP.map((r) => r.stationId),
        verdict: residualOrphanCSP.length === 0 ? 'CLEAN' : 'RESIDUAL_ORPHANS_DETECTED',
      },
      summary: `Re-pointed ${report.fuelPriceRepointed} FuelPrice rows, deleted ${report.cspDeleted} orphan CSP rows, rebuilt ${report.cspRebuilt} canonical CSP rows. Unresolvable: ${report.unresolvedOrphans.length}. Errors: ${report.errors.length}.`,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});