/**
 * bulkScanAndMergeDuplicates
 *
 * READ mode (default): Scans ALL Station records for physical duplicates
 * (same name+chain, distance ≤ 50m, status = active).
 * Returns full list of duplicate groups + summary.
 *
 * MERGE mode (dry_run=false, curator_confirmation=true):
 * Executes mergeDuplicateStations for every confirmed group.
 * Keeps lowest-created_date station as canonical.
 *
 * Input:
 * {
 *   dry_run?: boolean   (default: true — read only)
 *   curator_confirmation?: boolean  (must be true to execute merges)
 *   distance_threshold_m?: number   (default: 50)
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalize(s) {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
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
    const distance_threshold_m = body.distance_threshold_m ?? 50;

    if (!dry_run && !curator_confirmation) {
      return Response.json(
        { error: 'curator_confirmation must be true to execute merges' },
        { status: 400 }
      );
    }

    // ── Paginate through ALL active stations ──────────────────────────────────
    const PAGE = 500;
    let allStations = [];
    let page = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Station.list('-created_date', PAGE, page * PAGE);
      if (!batch || batch.length === 0) break;
      allStations = allStations.concat(batch);
      if (batch.length < PAGE) break;
      page++;
    }

    const activeStations = allStations.filter(
      s => s.status !== 'archived_duplicate' && s.latitude && s.longitude
    );

    // ── Group by normalized name + chain ──────────────────────────────────────
    const nameGroups = {};
    for (const s of activeStations) {
      const key = `${normalize(s.name)}||${normalize(s.chain || '')}`;
      if (!nameGroups[key]) nameGroups[key] = [];
      nameGroups[key].push(s);
    }

    // ── Find duplicate clusters within each name-group ────────────────────────
    const duplicateGroups = [];

    for (const group of Object.values(nameGroups)) {
      if (group.length < 2) continue;

      const visited = new Set();
      for (let i = 0; i < group.length; i++) {
        if (visited.has(group[i].id)) continue;
        const cluster = [group[i]];

        for (let j = i + 1; j < group.length; j++) {
          if (visited.has(group[j].id)) continue;
          const distM = haversineM(
            group[i].latitude, group[i].longitude,
            group[j].latitude, group[j].longitude
          );
          if (distM <= distance_threshold_m) {
            cluster.push(group[j]);
            visited.add(group[j].id);
          }
        }

        if (cluster.length > 1) {
          visited.add(group[i].id);
          let maxDist = 0;
          for (let a = 0; a < cluster.length; a++) {
            for (let b = a + 1; b < cluster.length; b++) {
              const d = haversineM(
                cluster[a].latitude, cluster[a].longitude,
                cluster[b].latitude, cluster[b].longitude
              );
              if (d > maxDist) maxDist = d;
            }
          }

          // Canonical = oldest by created_date (first imported)
          const sorted = [...cluster].sort(
            (a, b) => new Date(a.created_date) - new Date(b.created_date)
          );
          const canonical = sorted[0];
          const duplicates = sorted.slice(1);

          duplicateGroups.push({
            name: group[i].name,
            chain: group[i].chain || null,
            maxDistanceM: Math.round(maxDist),
            canonicalId: canonical.id,
            canonicalCreatedDate: canonical.created_date,
            duplicateIds: duplicates.map(s => s.id),
            allStations: cluster.map(s => ({
              id: s.id,
              name: s.name,
              chain: s.chain || null,
              lat: s.latitude,
              lng: s.longitude,
              sourceName: s.sourceName,
              sourceStationId: s.sourceStationId,
              created_date: s.created_date,
              isCanonical: s.id === canonical.id,
            })),
          });
        }
      }
    }

    // ── DRY RUN — return scan results without merging ─────────────────────────
    if (dry_run) {
      return Response.json({
        mode: 'DRY_RUN',
        timestamp: new Date().toISOString(),
        totalStationsScanned: allStations.length,
        activeStationsScanned: activeStations.length,
        duplicateGroupsFound: duplicateGroups.length,
        totalDuplicatesToArchive: duplicateGroups.reduce((sum, g) => sum + g.duplicateIds.length, 0),
        duplicateGroups,
        nextStep: dry_run
          ? 'Re-run with dry_run=false and curator_confirmation=true to execute all merges'
          : null,
      });
    }

    // ── EXECUTE — merge all groups ────────────────────────────────────────────
    const mergeResults = [];
    let totalArchived = 0;
    let totalFuelPriceMoved = 0;
    let errors = [];

    for (const group of duplicateGroups) {
      try {
        // Re-point FuelPrice records from duplicates to canonical
        let fuelPriceMoved = 0;
        for (const dupId of group.duplicateIds) {
          const prices = await base44.asServiceRole.entities.FuelPrice.filter({ stationId: dupId });
          for (const price of prices) {
            await base44.asServiceRole.entities.FuelPrice.update(price.id, {
              stationId: group.canonicalId,
            });
            fuelPriceMoved++;
          }
        }

        // Soft-archive duplicates
        await Promise.all(
          group.duplicateIds.map(dupId =>
            base44.asServiceRole.entities.Station.update(dupId, {
              status: 'archived_duplicate',
            })
          )
        );

        // Write audit log
        await base44.asServiceRole.entities.StationMergeLog.create({
          canonical_station_id: group.canonicalId,
          merged_station_ids: group.duplicateIds,
          fuelprice_records_moved: fuelPriceMoved,
          curator_id: user.email,
          timestamp: new Date().toISOString(),
          notes: `Bulk scan merge — ${group.name} (${group.chain || 'no chain'}), maxDist=${group.maxDistanceM}m. bulkScanAndMergeDuplicates 2026-03-24.`,
        });

        totalArchived += group.duplicateIds.length;
        totalFuelPriceMoved += fuelPriceMoved;

        mergeResults.push({
          name: group.name,
          chain: group.chain,
          canonicalId: group.canonicalId,
          duplicatesArchived: group.duplicateIds,
          fuelPriceMoved,
          success: true,
        });
      } catch (err) {
        errors.push({ group: group.name, error: err.message });
        mergeResults.push({
          name: group.name,
          chain: group.chain,
          canonicalId: group.canonicalId,
          duplicatesArchived: group.duplicateIds,
          success: false,
          error: err.message,
        });
      }
    }

    return Response.json({
      mode: 'EXECUTE',
      timestamp: new Date().toISOString(),
      curator_id: user.email,
      totalStationsScanned: allStations.length,
      activeStationsScanned: activeStations.length,
      duplicateGroupsFound: duplicateGroups.length,
      totalArchived,
      totalFuelPriceMoved,
      errorsCount: errors.length,
      errors,
      mergeResults,
    });

  } catch (err) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});