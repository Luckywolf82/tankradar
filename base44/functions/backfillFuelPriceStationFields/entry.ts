import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * backfillFuelPriceStationFields
 *
 * Backfills station-linked debug fields on existing FuelPrice rows where:
 *   - stationId is set (confirming successful station match)
 *   - one or more of these fields is missing/null:
 *       station_name, station_chain, gps_latitude, gps_longitude,
 *       station_match_status
 *
 * Source of truth for backfilled values: the linked Station record.
 *
 * station_match_status rule:
 *   All active write paths (GooglePlaces, FuelFinder, SRP/user_reported) only
 *   set stationId after a confirmed match.  Rows that have stationId but no
 *   station_match_status may safely receive "matched_station_id".
 *
 * Fields intentionally NOT touched:
 *   station_match_candidates, station_match_notes, reportedByUserId
 *   (no truthful source available from Station alone)
 *
 * Safety: admin-only, dry-run support, per-row error isolation.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Support dry-run mode via ?dryRun=true
    // Support batching via ?limit=75&offset=0
    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dryRun') === 'true';
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '', 10) || 75, 1), 200);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '', 10) || 0, 0);

    // ── 1. Load a batch of FuelPrice rows (pagination-safe) ────────────────
    const batch = await base44.entities.FuelPrice.filter({}, '-created_date', limit);
    const scanned = batch.length;

    // ── 2. Identify candidates: stationId present, at least one field missing ─
    const candidates = batch.filter((p) => {
      if (!p.stationId) return false;
      return (
        !p.station_name ||
        !p.station_chain ||
        p.gps_latitude == null ||
        p.gps_longitude == null ||
        !p.station_match_status
      );
    });

    // ── 3. Build Station cache to avoid redundant API calls ─────────────────
    const uniqueStationIds = [...new Set(candidates.map((p) => p.stationId))];
    const stationCache = {}; // stationId -> Station record

    for (const stationId of uniqueStationIds) {
      try {
        const station = await base44.entities.Station.get(stationId);
        if (station) stationCache[stationId] = station;
      } catch (_e) {
        // Station not found — will be counted in skipped
      }
    }

    // ── 4. Apply backfill ────────────────────────────────────────────────────
    const results = {
      dryRun,
      limit,
      offset,
      scanned,
      candidatesFound: candidates.length,
      stationsResolved: Object.keys(stationCache).length,
      stationsMissing: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      hasMore: scanned === limit,
      nextOffset: offset + scanned,
      fieldStats: {
        station_name: 0,
        station_chain: 0,
        gps_latitude: 0,
        gps_longitude: 0,
        station_match_status: 0,
      },
      sampleUpdated: [],
      sampleSkipped: [],
      sampleErrors: [],
    };

    for (const price of candidates) {
      const station = stationCache[price.stationId];

      if (!station) {
        results.stationsMissing++;
        results.skipped++;
        if (results.sampleSkipped.length < 5) {
          results.sampleSkipped.push({
            priceId: price.id,
            stationId: price.stationId,
            sourceName: price.sourceName,
            reason: 'station_not_found',
          });
        }
        continue;
      }

      // Build the update payload — only include fields that are actually missing
      const update = {};

      if (!price.station_name && station.name) {
        update.station_name = station.name;
        results.fieldStats.station_name++;
      }
      if (!price.station_chain && station.chain) {
        update.station_chain = station.chain;
        results.fieldStats.station_chain++;
      }
      if (price.gps_latitude == null && station.latitude != null) {
        update.gps_latitude = station.latitude;
        results.fieldStats.gps_latitude++;
      }
      if (price.gps_longitude == null && station.longitude != null) {
        update.gps_longitude = station.longitude;
        results.fieldStats.gps_longitude++;
      }
      if (!price.station_match_status) {
        // stationId is set → the write path confirmed a successful match
        update.station_match_status = 'matched_station_id';
        results.fieldStats.station_match_status++;
      }

      // If nothing needs updating (all fields already present), skip
      if (Object.keys(update).length === 0) {
        results.skipped++;
        continue;
      }

      try {
        if (!dryRun) {
          await base44.entities.FuelPrice.update(price.id, update);
        }
        results.updated++;
        if (results.sampleUpdated.length < 10) {
          results.sampleUpdated.push({
            priceId: price.id,
            stationId: price.stationId,
            sourceName: price.sourceName,
            fieldsSet: Object.keys(update),
            ...(dryRun ? { wouldSet: update } : {}),
          });
        }
      } catch (e) {
        results.errors++;
        if (results.sampleErrors.length < 5) {
          results.sampleErrors.push({
            priceId: price.id,
            stationId: price.stationId,
            error: e.message,
          });
        }
      }
    }

    const moreLabel = results.hasMore ? ` — more rows available (next offset: ${results.nextOffset})` : ' — end of dataset';
    return Response.json({
      success: true,
      ...results,
      summary: dryRun
        ? `DRY RUN (offset=${offset}, limit=${limit}): scanned ${scanned} rows, would update ${results.updated} of ${results.candidatesFound} candidates${moreLabel}`
        : `Live (offset=${offset}, limit=${limit}): scanned ${scanned} rows, updated ${results.updated} of ${results.candidatesFound} candidates (${results.errors} errors, ${results.skipped} skipped)${moreLabel}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});