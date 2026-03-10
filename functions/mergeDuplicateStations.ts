/**
 * mergeDuplicateStations
 *
 * Safe station merge execution engine — Phase 4B
 *
 * SAFETY RULES:
 * - Requires explicit curator_confirmation: true in payload
 * - Requires authenticated curator or admin user
 * - Processes exactly one duplicate group per invocation
 * - Re-points all FuelPrice records to canonical station
 * - Soft-archives duplicates (status = "archived_duplicate") — NO hard deletes
 * - Writes StationMergeLog audit entry before returning
 * - Does NOT touch matching engine, Phase 2 locked functions, or scoring logic
 *
 * Input payload:
 * {
 *   canonical_station_id: string,
 *   duplicate_station_ids: string[],
 *   curator_confirmation: true,   // must be literally true — no execution without this
 *   notes?: string
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // ── 1. Authenticate and authorise ─────────────────────────────────────────
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'admin' && user.role !== 'curator') {
    return Response.json(
      { error: 'Forbidden: curator or admin role required' },
      { status: 403 }
    );
  }

  // ── 2. Parse and validate payload ─────────────────────────────────────────
  const body = await req.json();
  const { canonical_station_id, duplicate_station_ids, curator_confirmation, notes } = body;

  if (curator_confirmation !== true) {
    return Response.json(
      {
        error:
          'curator_confirmation must be explicitly true. ' +
          'This operation requires deliberate curator approval and cannot be executed automatically.',
      },
      { status: 400 }
    );
  }

  if (!canonical_station_id || typeof canonical_station_id !== 'string') {
    return Response.json({ error: 'canonical_station_id is required and must be a string' }, { status: 400 });
  }

  if (!Array.isArray(duplicate_station_ids) || duplicate_station_ids.length === 0) {
    return Response.json(
      { error: 'duplicate_station_ids must be a non-empty array of station IDs' },
      { status: 400 }
    );
  }

  if (duplicate_station_ids.includes(canonical_station_id)) {
    return Response.json(
      { error: 'canonical_station_id must not appear in duplicate_station_ids' },
      { status: 400 }
    );
  }

  // ── 3. Validate all stations exist ────────────────────────────────────────
  const allIds = [canonical_station_id, ...duplicate_station_ids];

  const stationChecks = await Promise.all(
    allIds.map((id) =>
      base44.asServiceRole.entities.Station.get(id).catch(() => null)
    )
  );

  const missingIds = allIds.filter((_, i) => !stationChecks[i]);
  if (missingIds.length > 0) {
    return Response.json(
      { error: `Stations not found: ${missingIds.join(', ')}` },
      { status: 404 }
    );
  }

  // Canonical must not itself already be archived
  const canonicalStation = stationChecks[0];
  if (canonicalStation.status === 'archived_duplicate') {
    return Response.json(
      {
        error:
          'canonical_station_id refers to an already-archived station. ' +
          'Select an active station as canonical.',
      },
      { status: 400 }
    );
  }

  // ── 4. Re-point FuelPrice records from duplicates to canonical ────────────
  let fuelprice_records_moved = 0;

  for (const dupId of duplicate_station_ids) {
    const prices = await base44.asServiceRole.entities.FuelPrice.filter({ stationId: dupId });
    for (const price of prices) {
      await base44.asServiceRole.entities.FuelPrice.update(price.id, {
        stationId: canonical_station_id,
      });
      fuelprice_records_moved++;
    }
  }

  // ── 5. Soft-archive duplicate stations (NO hard deletes) ──────────────────
  await Promise.all(
    duplicate_station_ids.map((dupId) =>
      base44.asServiceRole.entities.Station.update(dupId, {
        status: 'archived_duplicate',
      })
    )
  );

  // ── 6. Write mandatory audit log ──────────────────────────────────────────
  await base44.asServiceRole.entities.StationMergeLog.create({
    canonical_station_id,
    merged_station_ids: duplicate_station_ids,
    fuelprice_records_moved,
    curator_id: user.email,
    timestamp: new Date().toISOString(),
    notes: notes ?? null,
  });

  // ── 7. Return confirmation ─────────────────────────────────────────────────
  return Response.json({
    success: true,
    canonical_station_id,
    duplicate_station_ids,
    fuelprice_records_moved,
    duplicates_archived: duplicate_station_ids.length,
    curator_id: user.email,
    timestamp: new Date().toISOString(),
  });
});