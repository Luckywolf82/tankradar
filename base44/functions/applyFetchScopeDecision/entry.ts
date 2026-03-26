import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * applyFetchScopeDecision — bulk fetch scope manager
 *
 * Applies fetchScopeStatus to one or more stations.
 * This is the ONLY sanctioned way to change fetch scope.
 * Does NOT delete stations. Does NOT touch reviewStatus or FuelPrice history.
 *
 * Modes:
 *   mode = "apply_list"    — apply fetchScopeStatus to explicit stationIds list
 *   mode = "bulk_remove_candidates" — set out_of_scope on all stations whose IDs
 *                             are provided as remove_candidate_ids (from testZone result)
 *
 * Body:
 *   { mode: "apply_list", stationIds: [...], fetchScopeStatus: "out_of_scope"|"monitor"|"keep" }
 *   { mode: "bulk_remove_candidates", stationIds: [...] }
 *
 * Returns:
 *   { updated: number, skipped: number, details: [...] }
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { mode, stationIds, fetchScopeStatus } = body;

  if (!mode) return Response.json({ error: 'mode required' }, { status: 400 });
  if (!Array.isArray(stationIds) || stationIds.length === 0) {
    return Response.json({ error: 'stationIds must be a non-empty array' }, { status: 400 });
  }

  let targetStatus;
  if (mode === 'apply_list') {
    const valid = ['keep', 'monitor', 'out_of_scope'];
    if (!valid.includes(fetchScopeStatus)) {
      return Response.json({ error: `fetchScopeStatus must be one of: ${valid.join(', ')}` }, { status: 400 });
    }
    targetStatus = fetchScopeStatus;
  } else if (mode === 'bulk_remove_candidates') {
    targetStatus = 'out_of_scope';
  } else {
    return Response.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  }

  const db = base44.asServiceRole;

  const results = [];
  let updated = 0;
  let skipped = 0;

  for (const stationId of stationIds) {
    const stations = await db.entities.Station.filter({ id: stationId });
    const station = stations[0];
    if (!station) {
      results.push({ stationId, result: 'not_found' });
      skipped++;
      continue;
    }

    // Skip if already at target status
    const current = station.fetchScopeStatus || 'keep';
    if (current === targetStatus) {
      results.push({ stationId, stationName: station.name, result: 'already_set', fetchScopeStatus: targetStatus });
      skipped++;
      continue;
    }

    await db.entities.Station.update(stationId, { fetchScopeStatus: targetStatus });
    results.push({
      stationId,
      stationName: station.name,
      result: 'updated',
      previous: current,
      fetchScopeStatus: targetStatus,
    });
    updated++;
  }

  return Response.json({
    success: true,
    mode,
    targetFetchScopeStatus: targetStatus,
    updated,
    skipped,
    total: stationIds.length,
    details: results,
  });
});