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
 * This function handles two modes:
 *
 *   MODE: "scan" (default)
 *     - Find all orphan stationIds (referenced in FuelPrice/CSP but absent from Station catalog)
 *     - Resolve each to a canonical stationId via GPS proximity + name matching
 *     - Return the full resolved mapping list
 *     - Does NOT write anything
 *
 *   MODE: "execute_one"
 *     - Execute remediation for exactly ONE orphanId → canonicalId mapping
 *     - Re-points FuelPrice rows, deletes orphan CSP row, refreshes canonical CSP
 *     - Caller loops through the mapping list from scan mode, calling execute_one per entry
 *     - This avoids timeout from doing all writes in a single function call
 *
 * SAFETY:
 *   - Admin-only.
 *   - execute_one requires curator_confirmation: true.
 *   - Does not touch Station catalog, matching engine, or Phase 2 functions.
 *   - Idempotent.
 *
 * Payload:
 *   Scan:        { mode: "scan" }
 *   Execute one: { mode: "execute_one", curator_confirmation: true, orphanId: string, canonicalId: string }
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

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9æøå]/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreCandidate(stationName, stationChain, lat, lon, candidate) {
  const dist = haversineKm(lat, lon, candidate.latitude, candidate.longitude);
  if (dist >= 0.1) return { score: -1, dist };

  let score = dist < 0.05 ? 2 : 1;
  const normName = normalize(stationName);
  const normCand = normalize(candidate.name);
  if (normName && normCand && (normName.includes(normCand) || normCand.includes(normName))) score += 2;
  const normChain = normalize(stationChain);
  const normCandChain = normalize(candidate.chain);
  if (normChain && normCandChain && normChain === normCandChain) score += 1;
  return { score, dist };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'scan';
    const now = new Date().toISOString();

    // ── Load Station catalog (shared by both modes) ───────────────────────────
    const allStations = await base44.asServiceRole.entities.Station.list();
    const stationById = {};
    for (const s of allStations) stationById[s.id] = s;
    const activeStations = allStations.filter(
      (s) => s.status !== 'archived_duplicate' && s.latitude != null && s.longitude != null
    );

    // ════════════════════════════════════════════════════════════════════════
    // MODE: execute_one
    // ════════════════════════════════════════════════════════════════════════
    if (mode === 'execute_one') {
      if (body.curator_confirmation !== true) {
        return Response.json({ error: 'curator_confirmation must be true' }, { status: 400 });
      }
      const { orphanId, canonicalId } = body;
      if (!orphanId || !canonicalId) {
        return Response.json({ error: 'orphanId and canonicalId required' }, { status: 400 });
      }

      const result = { orphanId, canonicalId, fuelPriceRepointed: 0, cspDeleted: 0, cspAction: null, errors: [] };

      // 1. Re-point FuelPrice rows
      const fpRows = await base44.asServiceRole.entities.FuelPrice.filter({ stationId: orphanId });
      for (const fp of fpRows) {
        try {
          await base44.asServiceRole.entities.FuelPrice.update(fp.id, { stationId: canonicalId });
          result.fuelPriceRepointed++;
        } catch (err) {
          result.errors.push({ type: 'fp_repoint_failed', fpId: fp.id, error: err.message });
        }
      }

      // 2. Delete orphan CSP row
      const orphanCSP = await base44.asServiceRole.entities.CurrentStationPrices.filter({ stationId: orphanId });
      for (const row of orphanCSP) {
        try {
          await base44.asServiceRole.entities.CurrentStationPrices.delete(row.id);
          result.cspDeleted++;
        } catch (err) {
          result.errors.push({ type: 'csp_delete_failed', cspId: row.id, error: err.message });
        }
      }

      // 3. Rebuild canonical CSP from all FuelPrice rows now on canonicalId
      try {
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
          } else {
            if (!latestDsl || new Date(fp.fetchedAt) > new Date(latestDsl.fetchedAt)) latestDsl = fp;
          }
        }

        if (latestG95 || latestDsl) {
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
            result.cspAction = 'updated';
          } else {
            await base44.asServiceRole.entities.CurrentStationPrices.create({ stationId: canonicalId, ...patch });
            result.cspAction = 'created';
          }
        } else {
          result.cspAction = 'skipped_no_eligible_prices';
        }
      } catch (err) {
        result.errors.push({ type: 'csp_rebuild_failed', error: err.message });
      }

      return Response.json({ success: true, mode: 'execute_one', ...result });
    }

    // ════════════════════════════════════════════════════════════════════════
    // MODE: scan (default)
    // ════════════════════════════════════════════════════════════════════════

    // Load all CSP rows
    const allCSP = await base44.asServiceRole.entities.CurrentStationPrices.list();

    // Find orphan stationIds in CSP
    const orphanCSPByStationId = {};
    for (const row of allCSP) {
      if (!row.stationId || stationById[row.stationId]) continue;
      if (!orphanCSPByStationId[row.stationId]) orphanCSPByStationId[row.stationId] = [];
      orphanCSPByStationId[row.stationId].push(row);
    }

    // Load all FuelPrice rows in batches, find orphan stationIds
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
      if (!fp.stationId || stationById[fp.stationId]) continue;
      if (!orphanFPByStationId[fp.stationId]) orphanFPByStationId[fp.stationId] = [];
      orphanFPByStationId[fp.stationId].push(fp);
    }

    const allOrphanIds = new Set([
      ...Object.keys(orphanCSPByStationId),
      ...Object.keys(orphanFPByStationId),
    ]);

    const resolvedMappings = [];
    const unresolvedOrphans = [];

    for (const orphanId of allOrphanIds) {
      const fpRows = orphanFPByStationId[orphanId] || [];
      const cspRows = orphanCSPByStationId[orphanId] || [];

      let lat = null, lon = null, stationName = null, stationChain = null;
      for (const fp of fpRows) {
        if (fp.gps_latitude != null) { lat = fp.gps_latitude; lon = fp.gps_longitude; stationName = fp.station_name; stationChain = fp.station_chain; break; }
      }
      if (lat == null && cspRows.length > 0) {
        lat = cspRows[0].latitude; lon = cspRows[0].longitude;
        stationName = cspRows[0].stationName; stationChain = cspRows[0].stationChain;
      }

      if (lat == null) {
        unresolvedOrphans.push({ orphanId, reason: 'no_gps', fpRowCount: fpRows.length, cspRowCount: cspRows.length });
        continue;
      }

      let bestScore = -1, bestCandidate = null;
      for (const candidate of activeStations) {
        const { score } = scoreCandidate(stationName, stationChain, lat, lon, candidate);
        if (score > bestScore) { bestScore = score; bestCandidate = candidate; }
      }

      if (bestScore >= 3 && bestCandidate) {
        resolvedMappings.push({
          orphanId,
          canonicalId: bestCandidate.id,
          canonicalName: bestCandidate.name,
          score: bestScore,
          fpRowCount: fpRows.length,
          cspRowCount: cspRows.length,
        });
      } else {
        unresolvedOrphans.push({
          orphanId, reason: 'no_confident_match', bestScore,
          bestCandidate: bestCandidate ? { id: bestCandidate.id, name: bestCandidate.name } : null,
          stationName, lat, lon,
          fpRowCount: fpRows.length, cspRowCount: cspRows.length,
        });
      }
    }

    return Response.json({
      mode: 'scan',
      timestamp: now,
      totalOrphanIds: allOrphanIds.size,
      resolvedCount: resolvedMappings.length,
      unresolvedCount: unresolvedOrphans.length,
      resolvedMappings,
      unresolvedOrphans,
      instructions: 'Call this function with mode="execute_one" and curator_confirmation=true for each entry in resolvedMappings to apply remediation.',
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});