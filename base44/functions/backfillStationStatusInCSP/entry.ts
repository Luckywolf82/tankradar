import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * BACKFILL: stationStatus in CurrentStationPrices
 *
 * For each CurrentStationPrices row, looks up the Station entity and writes
 * stationStatus (active | archived_duplicate) onto the CSP row.
 *
 * This is a one-time backfill to ensure existing rows reflect the current
 * Station.status after the stationStatus field was added to the schema.
 *
 * Admin-only.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const cspRows = await base44.asServiceRole.entities.CurrentStationPrices.list();

    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    const errors = [];

    for (const csp of cspRows) {
      if (!csp.stationId) { skipped++; continue; }

      try {
        const stationRows = await base44.asServiceRole.entities.Station.filter({ id: csp.stationId });
        if (!stationRows || stationRows.length === 0) { notFound++; continue; }

        const station = stationRows[0];
        const stationStatus = station.status || 'active';

        // Only update if the field is missing or stale
        if (csp.stationStatus === stationStatus) { skipped++; continue; }

        await base44.asServiceRole.entities.CurrentStationPrices.update(csp.id, { stationStatus });
        updated++;
      } catch (err) {
        errors.push({ cspId: csp.id, stationId: csp.stationId, error: err.message });
      }
    }

    return Response.json({
      total: cspRows.length,
      updated,
      skipped,
      notFound,
      errors,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});