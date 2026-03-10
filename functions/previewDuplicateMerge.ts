/**
 * previewDuplicateMerge
 *
 * Phase 4B — read-only dry-run preview for duplicate station remediation.
 *
 * SAFETY RULES:
 * - Zero writes — no records are mutated, archived, or created
 * - No StationMergeLog entry is written
 * - No FuelPrice records are moved
 * - No Station.status is changed
 * - Does NOT call mergeDuplicateStations or executeDuplicateMerge
 * - One duplicate group per request
 * - Requires curator or admin role
 *
 * Input payload:
 * {
 *   canonical_station_id: string,
 *   duplicate_station_ids: string[]
 * }
 *
 * Output:
 * {
 *   canonical_station_exists: boolean,
 *   canonical_already_archived: boolean,
 *   duplicate_stations_found: number,
 *   duplicate_station_ids_missing: string[],
 *   canonical_in_duplicate_list: boolean,
 *   fuelprice_records_would_be_repointed: number,
 *   duplicate_stations_would_be_archived: number,
 *   safe_to_merge: boolean,
 *   blockers: string[]
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // ── 1. Authenticate and authorise ────────────────────────────────────────
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
  const { canonical_station_id, duplicate_station_ids } = body;

  if (!canonical_station_id || typeof canonical_station_id !== 'string') {
    return Response.json({ error: 'canonical_station_id is required' }, { status: 400 });
  }

  if (!Array.isArray(duplicate_station_ids) || duplicate_station_ids.length === 0) {
    return Response.json(
      { error: 'duplicate_station_ids must be a non-empty array' },
      { status: 400 }
    );
  }

  const blockers = [];

  // ── 3. Check for canonical in duplicate list ───────────────────────────────
  const canonical_in_duplicate_list = duplicate_station_ids.includes(canonical_station_id);
  if (canonical_in_duplicate_list) {
    blockers.push('canonical_station_id appears in duplicate_station_ids — these must be disjoint');
  }

  // ── 4. Fetch canonical station (read-only) ────────────────────────────────
  const canonicalStation = await base44.asServiceRole.entities.Station.get(canonical_station_id)
    .catch(() => null);

  const canonical_station_exists = canonicalStation !== null;
  const canonical_already_archived = canonicalStation?.status === 'archived_duplicate';

  if (!canonical_station_exists) {
    blockers.push(`canonical station not found: ${canonical_station_id}`);
  }
  if (canonical_already_archived) {
    blockers.push('canonical station is already archived_duplicate — select an active station');
  }

  // ── 5. Fetch duplicate stations (read-only) ───────────────────────────────
  const dupFetches = await Promise.all(
    duplicate_station_ids.map((id) =>
      base44.asServiceRole.entities.Station.get(id).catch(() => null)
    )
  );

  const duplicate_station_ids_missing = duplicate_station_ids.filter((_, i) => !dupFetches[i]);
  const duplicate_stations_found = duplicate_station_ids.length - duplicate_station_ids_missing.length;

  if (duplicate_station_ids_missing.length > 0) {
    blockers.push(`duplicate stations not found: ${duplicate_station_ids_missing.join(', ')}`);
  }

  // Warn if any duplicate is already archived (not a hard blocker but informational)
  const alreadyArchivedDups = dupFetches
    .map((s, i) => (s?.status === 'archived_duplicate' ? duplicate_station_ids[i] : null))
    .filter(Boolean);
  if (alreadyArchivedDups.length > 0) {
    blockers.push(`already archived duplicates (would be no-op): ${alreadyArchivedDups.join(', ')}`);
  }

  // ── 6. Count FuelPrice records that would be re-pointed (read-only) ───────
  let fuelprice_records_would_be_repointed = 0;

  const validDupIds = duplicate_station_ids.filter((_, i) => dupFetches[i] !== null);
  const priceCounts = await Promise.all(
    validDupIds.map((id) =>
      base44.asServiceRole.entities.FuelPrice.filter({ stationId: id })
        .then((records) => records.length)
        .catch(() => 0)
    )
  );
  fuelprice_records_would_be_repointed = priceCounts.reduce((sum, n) => sum + n, 0);

  // ── 7. Compute safe_to_merge ───────────────────────────────────────────────
  const safe_to_merge = blockers.length === 0;

  // ── 8. Return read-only preview ────────────────────────────────────────────
  return Response.json({
    canonical_station_exists,
    canonical_already_archived,
    duplicate_stations_found,
    duplicate_station_ids_missing,
    canonical_in_duplicate_list,
    fuelprice_records_would_be_repointed,
    duplicate_stations_would_be_archived: validDupIds.length,
    safe_to_merge,
    blockers,
  });
});