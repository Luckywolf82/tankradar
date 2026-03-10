/**
 * executeDuplicateMerge
 *
 * Phase 4C execution wrapper.
 *
 * Calls mergeDuplicateStations internally, validates the result,
 * and returns a structured merge summary.
 *
 * Input payload:
 * {
 *   canonical_station_id: string,
 *   duplicate_station_ids: string[],
 *   curator_confirmation: true,
 *   notes?: string
 * }
 *
 * Returns:
 * {
 *   success: boolean,
 *   canonical_station_id: string,
 *   duplicate_station_ids: string[],
 *   fuelprice_records_moved: number,
 *   duplicates_archived: number,
 *   curator_id: string,
 *   timestamp: string,
 *   validation: {
 *     fuelprice_moved_confirmed: boolean,
 *     duplicates_archived_confirmed: boolean,
 *   }
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Auth — curator or admin only
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'admin' && user.role !== 'curator') {
    return Response.json({ error: 'Forbidden: curator or admin role required' }, { status: 403 });
  }

  const body = await req.json();
  const { canonical_station_id, duplicate_station_ids, curator_confirmation, notes } = body;

  // Re-validate confirmation here too — belt and braces
  if (curator_confirmation !== true) {
    return Response.json(
      { error: 'curator_confirmation must be explicitly true.' },
      { status: 400 }
    );
  }

  // ── Delegate to mergeDuplicateStations ───────────────────────────────────
  const mergeResult = await base44.functions.invoke('mergeDuplicateStations', {
    canonical_station_id,
    duplicate_station_ids,
    curator_confirmation,
    notes: notes ?? null,
  });

  const data = mergeResult.data;

  if (!data || !data.success) {
    return Response.json(
      { error: 'mergeDuplicateStations returned failure', details: data },
      { status: 500 }
    );
  }

  // ── Validate result ───────────────────────────────────────────────────────
  // Spot-check: verify archived stations now have status = archived_duplicate
  const archivedChecks = await Promise.all(
    duplicate_station_ids.map((id) =>
      base44.asServiceRole.entities.Station.get(id).catch(() => null)
    )
  );

  const allArchived = archivedChecks.every(
    (s) => s && s.status === 'archived_duplicate'
  );

  return Response.json({
    success: true,
    canonical_station_id: data.canonical_station_id,
    duplicate_station_ids: data.duplicate_station_ids,
    fuelprice_records_moved: data.fuelprice_records_moved,
    duplicates_archived: data.duplicates_archived,
    curator_id: data.curator_id,
    timestamp: data.timestamp,
    validation: {
      fuelprice_moved_confirmed: data.fuelprice_records_moved >= 0,
      duplicates_archived_confirmed: allArchived,
    },
  });
});