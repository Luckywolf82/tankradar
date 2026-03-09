import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * STATION DUPLICATE DETECTION (PREVIEW ONLY)
 *
 * Purpose:
 * - Generate preview report of potential duplicate Station records
 * - Identify candidates for manual curator review
 * - NO AUTOMATIC ACTIONS (no merge, delete, or consolidation)
 *
 * Classification levels:
 * 1. EXACT DUPLICATES: identical coordinates + same/similar names
 * 2. POSSIBLE NEAR-DUPLICATES: same chain + name, coordinates >1m apart
 * 3. AMBIGUOUS: same name, very different chains or locations
 *
 * This is a DATA QUALITY inspection tool, not a matching-engine audit.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const payload = await req.json();

    if (!payload.city) {
      return Response.json({ error: 'Missing required field: city' }, { status: 400 });
    }

    const city = payload.city;

    // Fetch all stations for the city
    const stations = await base44.entities.Station.filter({ city });

    if (!stations || stations.length === 0) {
      return Response.json({
        status: 'no_stations_found',
        city,
        duplicates: [],
        summary: {
          total: 0,
          exact_duplicates: 0,
          possible_near_duplicates: 0,
          ambiguous_cases: 0,
        },
      });
    }

    // === EXACT NAME + CHAIN GROUPING ===
    const byNormalizedKey = {};
    const normalizeKey = (name, chain) => {
      const n = (name || '').toLowerCase().trim();
      const c = (chain || '').toLowerCase().trim() || 'unknown';
      return `${n}|${c}`;
    };

    stations.forEach((s) => {
      const key = normalizeKey(s.name, s.chain);
      if (!byNormalizedKey[key]) byNormalizedKey[key] = [];
      byNormalizedKey[key].push(s);
    });

    // === COORDINATE GROUPING (for spotting coordinate-only duplicates) ===
    const byCoordinates = {};
    const coordKey = (lat, lon) => {
      return `${lat.toFixed(6)}|${lon.toFixed(6)}`;
    };

    stations.forEach((s) => {
      if (s.latitude != null && s.longitude != null) {
        const key = coordKey(s.latitude, s.longitude);
        if (!byCoordinates[key]) byCoordinates[key] = [];
        byCoordinates[key].push(s);
      }
    });

    // === CLASSIFY DUPLICATES ===
    const duplicateGroups = [];

    // 1. EXACT DUPLICATES: Same normalized name+chain AND identical coordinates
    Object.entries(byNormalizedKey).forEach(([nameChainKey, stationGroup]) => {
      if (stationGroup.length > 1) {
        // Check if any pairs share exact coordinates
        for (let i = 0; i < stationGroup.length; i++) {
          for (let j = i + 1; j < stationGroup.length; j++) {
            const s1 = stationGroup[i];
            const s2 = stationGroup[j];

            if (
              s1.latitude === s2.latitude &&
              s1.longitude === s2.longitude
            ) {
              duplicateGroups.push({
                classification: 'EXACT_DUPLICATE',
                confidence: 'HIGH',
                reason: 'Identical coordinates + same name & chain',
                stations: [
                  formatStationSummary(s1),
                  formatStationSummary(s2),
                ],
                distance_meters: 0,
                review_action: 'CONSOLIDATE (keep newer by created_date)',
              });
            }
          }
        }
      }
    });

    // 2. COORDINATE DUPLICATES: Multiple stations at same GPS point (regardless of name)
    Object.entries(byCoordinates).forEach(([coordKey, stationGroup]) => {
      if (stationGroup.length > 1) {
        // Check if we haven't already flagged this as exact_duplicate above
        const alreadyFlagged = duplicateGroups.some((dg) =>
          dg.stations.length === 2 &&
          dg.stations.every((s) =>
            stationGroup.some((sg) => sg.id === s.id)
          )
        );

        if (!alreadyFlagged) {
          duplicateGroups.push({
            classification: 'COORDINATE_DUPLICATE',
            confidence: 'HIGH',
            reason: 'Identical coordinates but different names/chains',
            stations: stationGroup.map(formatStationSummary),
            distance_meters: 0,
            review_action: 'MANUAL REVIEW (may be legitimate variation)',
          });
        }
      }
    });

    // 3. POSSIBLE NEAR-DUPLICATES: Same name+chain, close coordinates (>1m, <50m)
    Object.entries(byNormalizedKey).forEach(([nameChainKey, stationGroup]) => {
      if (stationGroup.length > 1) {
        // Calculate pairwise distances
        for (let i = 0; i < stationGroup.length; i++) {
          for (let j = i + 1; j < stationGroup.length; j++) {
            const s1 = stationGroup[i];
            const s2 = stationGroup[j];

            if (s1.latitude != null && s2.latitude != null) {
              const dist = haversineDistance(
                s1.latitude,
                s1.longitude,
                s2.latitude,
                s2.longitude
              );

              // Only flag if >1m and <50m (near but not identical)
              if (dist > 1 && dist < 50) {
                duplicateGroups.push({
                  classification: 'POSSIBLE_NEAR_DUPLICATE',
                  confidence: 'MEDIUM',
                  reason: `Same name & chain, ${Math.round(dist)}m apart (may be different entrances or data entry error)`,
                  stations: [
                    formatStationSummary(s1),
                    formatStationSummary(s2),
                  ],
                  distance_meters: Math.round(dist),
                  review_action: 'INSPECT & CLASSIFY (different entrances vs. duplicate)',
                });
              }
            }
          }
        }
      }
    });

    // Remove duplicate group entries
    const uniqueDuplicateGroups = [];
    const seen = new Set();

    duplicateGroups.forEach((dg) => {
      const signature = dg.stations
        .map((s) => s.id)
        .sort()
        .join('|');

      if (!seen.has(signature)) {
        seen.add(signature);
        uniqueDuplicateGroups.push(dg);
      }
    });

    // Sort by confidence
    const sorted = uniqueDuplicateGroups.sort((a, b) => {
      const confidenceOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    });

    return Response.json({
      status: 'duplicate_detection_complete',
      city,
      total_stations: stations.length,
      duplicate_groups: sorted,
      summary: {
        total_stations: stations.length,
        exact_duplicates: sorted.filter(
          (dg) => dg.classification === 'EXACT_DUPLICATE'
        ).length,
        coordinate_duplicates: sorted.filter(
          (dg) => dg.classification === 'COORDINATE_DUPLICATE'
        ).length,
        possible_near_duplicates: sorted.filter(
          (dg) => dg.classification === 'POSSIBLE_NEAR_DUPLICATE'
        ).length,
        total_groups: sorted.length,
      },
      governance_note:
        'This is a PREVIEW-ONLY report. No consolidation or deletion is performed. Manual curator review required for any cleanup decisions.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ===== UTILITIES =====

function formatStationSummary(station) {
  return {
    id: station.id,
    name: station.name,
    chain: station.chain || 'unknown',
    address: station.address || null,
    latitude: station.latitude,
    longitude: station.longitude,
    created_date: station.created_date,
    sourceName: station.sourceName,
  };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Return in meters
}