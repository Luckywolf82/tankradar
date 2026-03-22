import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * BATCH BACKFILL — User-Reported Station Matching
 *
 * Designed for scheduled automation. No user session required.
 * Uses asServiceRole for all DB operations.
 *
 * Fetches user_reported FuelPrice records where:
 *   - station_match_status is null OR review_needed_station_match
 *   - gps_latitude and gps_longitude are present
 *
 * For each record, runs the conservative matching engine against Station catalog
 * and updates the FuelPrice record with the result.
 *
 * Processes up to BATCH_SIZE records per run to stay within timeout limits.
 */

const BATCH_SIZE = 50;
const MAX_DISTANCE_METERS = 300;

// ── Utilities ─────────────────────────────────────────────────────────────────

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeStr(s) {
  return (s || '').toLowerCase().trim().replace(/[-\s]+/g, ' ');
}

const CHAIN_ALIASES = {
  'circle k': ['circle k', 'circlk'],
  'uno-x': ['uno-x', 'unox'],
  'shell': ['shell'],
  'esso': ['esso'],
  'statoil': ['statoil'],
  'st1': ['st1'],
  'best': ['best'],
  'yx': ['yx'],
};

function normalizeChain(raw) {
  if (!raw) return null;
  const t = normalizeStr(raw);
  for (const [canonical, aliases] of Object.entries(CHAIN_ALIASES)) {
    if (aliases.some(a => t === a || t.includes(a))) return canonical;
  }
  return null;
}

function bigramSim(a, b) {
  if (!a || !b) return 0;
  const bigrams = s => {
    const n = normalizeStr(s);
    const set = new Set();
    for (let i = 0; i < n.length - 1; i++) set.add(n.slice(i, i + 2));
    return set;
  };
  const ba = bigrams(a), bb = bigrams(b);
  const inter = [...ba].filter(x => bb.has(x)).length;
  const union = new Set([...ba, ...bb]).size;
  return union === 0 ? 0 : inter / union;
}

function scoreMatch(obs, stn) {
  const dist = haversineDistance(obs.lat, obs.lon, stn.latitude, stn.longitude);
  if (dist > MAX_DISTANCE_METERS) return 0;

  // Chain gate
  const obsChain = normalizeChain(obs.chain);
  const stnChain = normalizeChain(stn.chain);
  if (obsChain && stnChain && obsChain !== stnChain) return 0; // hard mismatch

  let score = 0;

  // Distance signal
  if (dist <= 30) score += 30;
  else if (dist <= 75) score += 20;
  else if (dist <= 150) score += 10;
  else if (dist <= 300) score += 5;

  // Chain signal
  if (obsChain && stnChain && obsChain === stnChain) score += 25;

  // Name similarity
  const sim = bigramSim(obs.name, stn.name);
  if (sim >= 0.95) score += 30;
  else if (sim >= 0.85) score += 20;
  else if (sim >= 0.70) score += 10;
  else if (sim >= 0.50) score += 5;

  return score;
}

function decide(scored) {
  if (!scored || scored.length === 0) {
    return { outcome: 'no_safe_station_match', stationId: null, candidates: [] };
  }
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const MATCH_THRESHOLD = 65;
  const REVIEW_THRESHOLD = 35;
  const GAP_MIN = 10;

  if (sorted.length === 1) {
    if (top.score >= MATCH_THRESHOLD) return { outcome: 'matched_station_id', stationId: top.stationId, candidates: [top.stationId] };
    if (top.score >= REVIEW_THRESHOLD) return { outcome: 'review_needed_station_match', stationId: null, candidates: [top.stationId] };
    return { outcome: 'no_safe_station_match', stationId: null, candidates: [] };
  }

  const gap = top.score - sorted[1].score;
  if (top.score >= MATCH_THRESHOLD && gap >= GAP_MIN) {
    return { outcome: 'matched_station_id', stationId: top.stationId, candidates: [top.stationId] };
  }
  if (top.score >= MATCH_THRESHOLD || top.score >= REVIEW_THRESHOLD) {
    return { outcome: 'review_needed_station_match', stationId: null, candidates: sorted.slice(0, 3).map(m => m.stationId) };
  }
  return { outcome: 'no_safe_station_match', stationId: null, candidates: [] };
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch unmatched user_reported prices with GPS coordinates
    const allUnmatched = await base44.asServiceRole.entities.FuelPrice.filter(
      { priceType: 'user_reported' },
      '-created_date',
      500
    );

    // Keep only records that need matching and have GPS data.
    // Also include recent no_safe_station_match records (last 30 days) to retry them,
    // since the inline matcher at submission time may have failed due to city gate mismatch.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toProcess = allUnmatched
      .filter(p => {
        if (!p.gps_latitude || !p.gps_longitude) return false;
        if (p.station_match_status == null || p.station_match_status === 'review_needed_station_match') return true;
        // Retry recent no_safe_station_match records
        if (p.station_match_status === 'no_safe_station_match' && p.created_date >= thirtyDaysAgo) return true;
        return false;
      })
      .slice(0, BATCH_SIZE);

    if (toProcess.length === 0) {
      return Response.json({ success: true, message: 'No records to process', processed: 0 });
    }

    // Load all active stations once
    const allStations = await base44.asServiceRole.entities.Station.filter({ status: 'active' });
    const validStations = allStations.filter(s => s.latitude != null && s.longitude != null);

    let matched = 0, reviewNeeded = 0, noMatch = 0, errors = 0;

    for (const price of toProcess) {
      try {
        const obs = {
          lat: price.gps_latitude,
          lon: price.gps_longitude,
          name: price.station_name || '',
          chain: price.station_chain || null,
        };

        // Geo-filter: only score stations within 1km first (performance)
        const nearby = validStations.filter(s =>
          haversineDistance(obs.lat, obs.lon, s.latitude, s.longitude) <= 1000
        );

        const scored = nearby
          .map(s => ({ stationId: s.id, score: scoreMatch(obs, s) }))
          .filter(m => m.score > 0);

        const decision = decide(scored);

        const updateData = {
          station_match_status: decision.outcome,
          station_match_candidates: decision.candidates,
          station_match_notes: `backfill_run:${new Date().toISOString().slice(0, 10)}`,
        };

        if (decision.outcome === 'matched_station_id' && decision.stationId) {
          updateData.stationId = decision.stationId;
        }

        await base44.asServiceRole.entities.FuelPrice.update(price.id, updateData);

        if (decision.outcome === 'matched_station_id') matched++;
        else if (decision.outcome === 'review_needed_station_match') reviewNeeded++;
        else noMatch++;
      } catch (err) {
        console.error(`Error processing FuelPrice ${price.id}: ${err.message}`);
        errors++;
      }
    }

    const remaining = allUnmatched.filter(p =>
      (p.station_match_status == null || p.station_match_status === 'review_needed_station_match') &&
      p.gps_latitude != null && p.gps_longitude != null
    ).length - toProcess.length;

    return Response.json({
      success: true,
      processed: toProcess.length,
      matched,
      reviewNeeded,
      noMatch,
      errors,
      remainingEstimate: Math.max(0, remaining),
    });

  } catch (error) {
    console.error(`Backfill failed: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});