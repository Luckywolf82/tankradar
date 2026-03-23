import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * STATION PROXIMITY PRE-FILTER
 * 
 * Purpose:
 * Limit candidate pool to stations within a configurable radius before
 * Phase 2 matching engine evaluates them. This is a performance optimization
 * that does NOT modify scoring logic or matching outcomes.
 * 
 * Safety:
 * - Read-only utility (no state modifications)
 * - Admin-gated for consistency
 * - Includes fallback to full catalog if radius returns 0 candidates
 * - Returns metadata for debugging
 * 
 * Constraint:
 * This utility must not change Phase 2 matching behavior.
 * It only reduces the candidate pool size before scoring begins.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();

    if (payload.gps_lat == null || payload.gps_lon == null || !payload.city) {
      return Response.json(
        { error: 'Missing required fields: gps_lat, gps_lon, city' },
        { status: 400 }
      );
    }

    const radiusMeters = payload.radius_meters || 3000;
    const maxCandidates = payload.max_candidates || 20;

    // Fetch all stations in the same city
    const allStations = await base44.entities.Station.filter({
      city: payload.city,
    });

    if (!allStations || allStations.length === 0) {
      return Response.json({
        status: 'no_candidates_nearby',
        city: payload.city,
        input_gps: { lat: payload.gps_lat, lon: payload.gps_lon },
        radius_meters: radiusMeters,
        candidates: [],
        fallback_used: false,
        total_candidates: 0,
        note: 'No stations found in city',
      });
    }

    // Pre-filter: stations with valid coordinates
    const validStations = allStations.filter(
      (s) => s.latitude != null && s.longitude != null
    );

    // Score by distance and keep only those within radius
    const nearbyStations = validStations
      .map((station) => ({
        ...station,
        distance: haversineDistance(
          payload.gps_lat,
          payload.gps_lon,
          station.latitude,
          station.longitude
        ),
      }))
      .filter((s) => s.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxCandidates);

    // Fallback: if no nearby candidates, return all valid stations (sorted by distance)
    const usedFallback = nearbyStations.length === 0;
    const finalCandidates = usedFallback
      ? validStations
          .map((station) => ({
            ...station,
            distance: haversineDistance(
              payload.gps_lat,
              payload.gps_lon,
              station.latitude,
              station.longitude
            ),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, maxCandidates)
      : nearbyStations;

    return Response.json({
      status: 'nearby_candidates_returned',
      city: payload.city,
      input_gps: { lat: payload.gps_lat, lon: payload.gps_lon },
      radius_meters: radiusMeters,
      fallback_used: usedFallback,
      total_stations_in_city: allStations.length,
      valid_stations_with_coordinates: validStations.length,
      candidates_within_radius: nearbyStations.length,
      final_candidate_count: finalCandidates.length,
      candidates: finalCandidates.map((s) => ({
        id: s.id,
        name: s.name,
        chain: s.chain,
        city: s.city,
        latitude: s.latitude,
        longitude: s.longitude,
        areaLabel: s.areaLabel,
        distance_meters: Math.round(s.distance),
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

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