import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * STATION DUPLICATE DETECTION (PREVIEW ONLY)
 * 
 * Purpose:
 * - Identify duplicate and near-duplicate Station records
 * - Group by city, chain, location
 * - Generate preview report for manual review
 * 
 * NO automatic merge, delete, or apply operations.
 * Report only. Admin use only.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const city = payload.city || 'Trondheim';

    // Query all stations in the city
    const allStations = await base44.entities.Station.filter({ city }, '-updated_date', 500);

    if (!allStations || allStations.length === 0) {
      return Response.json({ error: `No stations found in ${city}` }, { status: 400 });
    }

    // Group by normalized name + chain for quick duplicate detection
    const groups = {};
    const byCoordinates = {};

    allStations.forEach(station => {
      const normalizedName = (station.normalizedName || station.name || '').toLowerCase().trim();
      const chain = (station.chain || 'unknown').toLowerCase().trim();
      const key = `${normalizedName}|${chain}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(station);

      // Also group by near-duplicate coordinates (within ~50m)
      const coordKey = `${Math.round(station.latitude * 10000)},${Math.round(station.longitude * 10000)}`;
      if (!byCoordinates[coordKey]) byCoordinates[coordKey] = [];
      byCoordinates[coordKey].push(station);
    });

    // Find groups with duplicates (same name + chain, or coordinates)
    const duplicateGroups = [];

    // Name + chain duplicates
    Object.entries(groups).forEach(([key, stations]) => {
      if (stations.length > 1) {
        duplicateGroups.push({
          type: 'exact_name_chain_duplicate',
          key,
          count: stations.length,
          stations: stations.map(s => ({
            id: s.id,
            name: s.name,
            chain: s.chain,
            latitude: s.latitude,
            longitude: s.longitude,
            address: s.address,
            created_date: s.created_date,
            sourceName: s.sourceName
          }))
        });
      }
    });

    // Coordinate duplicates: EXACT coordinate match only (≤1m tolerance)
    // Do NOT flag stations as duplicates just because they are nearby
    // Only flag identical or near-identical GPS coordinates
    const coordinateDuplicates = [];
    Object.entries(byCoordinates).forEach(([coordKey, stations]) => {
      if (stations.length > 1) {
        // Calculate actual distances between all pairs
        const distances = [];
        for (let i = 0; i < stations.length; i++) {
          for (let j = i + 1; j < stations.length; j++) {
            const dist = haversine(
              stations[i].latitude,
              stations[i].longitude,
              stations[j].latitude,
              stations[j].longitude
            ) * 1000; // Convert to meters
            distances.push(dist);
          }
        }

        const maxDist = Math.max(...distances);
        const minDist = Math.min(...distances);

        // CONSERVATIVE: Only flag as coordinate duplicate if max distance ≤1m
        // This catches only truly identical or near-identical coordinates
        if (maxDist <= 1) {
          coordinateDuplicates.push({
            type: 'exact_coordinate_duplicate',
            maxDistanceMeters: Math.round(maxDist),
            minDistanceMeters: Math.round(minDist),
            count: stations.length,
            classification: 'EXACT_DUPLICATE (identical coordinates)',
            stations: stations.map(s => ({
              id: s.id,
              name: s.name,
              chain: s.chain,
              latitude: s.latitude,
              longitude: s.longitude,
              address: s.address,
              created_date: s.created_date,
              sourceName: s.sourceName
            }))
          });
        }
      }
    });

    // Filter out single-station coordinate groups (should not exist after above logic)
    const coordDupesFiltered = coordinateDuplicates.filter(g => g.stations.length > 1);

    return Response.json({
      status: 'preview_report',
      city,
      totalStations: allStations.length,
      duplicateClusters: {
        exactNameChain: duplicateGroups.length,
        coordinateProximity: coordDupesFiltered.length
      },
      duplicateGroups: [
        ...duplicateGroups,
        ...coordDupesFiltered
      ],
      summary: {
        analysisNote: 'PREVIEW ONLY. No automatic actions taken. Manual review required before any cleanup.',
        recommendedNextStep: 'Review groups manually via StationReview governance pipeline. Propose consolidation or correction via StationCandidate process.'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function haversine(lat1, lon1, lat2, lon2) {
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
  return R * c; // Return in km
}