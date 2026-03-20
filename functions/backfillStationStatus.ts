import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all Station rows
    const allStations = await base44.asServiceRole.entities.Station.list();

    const archivedDuplicateCount = allStations.filter(s => s.status === 'archived_duplicate').length;
    const alreadyActiveCount = allStations.filter(s => s.status === 'active').length;
    const toBackfillRows = allStations.filter(s => !s.status || s.status === '');

    const results = {
      total_stations: allStations.length,
      already_active: alreadyActiveCount,
      archived_duplicate_preserved: archivedDuplicateCount,
      backfill_needed: toBackfillRows.length,
      backfilled: 0,
      errors: [],
    };

    // Backfill rows with null/empty status → 'active'
    for (const station of toBackfillRows) {
      try {
        await base44.asServiceRole.entities.Station.update(station.id, { status: 'active' });
        results.backfilled++;
      } catch (err) {
        results.errors.push({ id: station.id, name: station.name, error: err.message, code: err.code || null });
      }
    }

    // Verify counts after backfill
    const allStationsAfter = await base44.asServiceRole.entities.Station.list();
    const activeAfter = allStationsAfter.filter(s => s.status === 'active').length;
    const archivedAfter = allStationsAfter.filter(s => s.status === 'archived_duplicate').length;
    const stillBlankAfter = allStationsAfter.filter(s => !s.status || s.status === '').length;

    return Response.json({
      success: results.errors.length === 0,
      before: {
        total: results.total_stations,
        active: alreadyActiveCount,
        archived_duplicate: archivedDuplicateCount,
        blank_status: results.backfill_needed,
      },
      after: {
        total: allStationsAfter.length,
        active: activeAfter,
        archived_duplicate: archivedAfter,
        blank_status: stillBlankAfter,
      },
      backfilled: results.backfilled,
      errors: results.errors,
      message: `Backfill complete: ${results.backfilled} Station rows updated to status='active'. ${archivedDuplicateCount} archived_duplicate rows preserved unchanged.`,
    });
  } catch (error) {
    return Response.json({
      status: 'ERROR',
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});
