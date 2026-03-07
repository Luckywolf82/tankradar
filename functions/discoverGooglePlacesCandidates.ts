import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Haversine distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Normalize name for matching
function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

// Simple string similarity (Levenshtein-ish)
function stringSimilarity(a, b) {
  const normA = normalizeName(a);
  const normB = normalizeName(b);
  if (normA === normB) return 1;
  const longer = normA.length > normB.length ? normA : normB;
  const shorter = normA.length > normB.length ? normB : normA;
  if (longer.length === 0) return 1;
  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { latitude, longitude, radiusKm = 25 } = await req.json();

    if (!latitude || !longitude) {
      return Response.json({ error: 'Missing latitude/longitude' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Query Google Places
    const gpUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    gpUrl.searchParams.set('location', `${latitude},${longitude}`);
    gpUrl.searchParams.set('radius', radiusKm * 1000);
    gpUrl.searchParams.set('type', 'gas_station');
    gpUrl.searchParams.set('key', apiKey);

    const gpRes = await fetch(gpUrl.toString());
    if (!gpRes.ok) {
      return Response.json({ error: `GP API error: ${gpRes.status}` }, { status: gpRes.status });
    }

    const gpData = await gpRes.json();
    if (!gpData.results) {
      return Response.json({ candidates: [], deduped: [] });
    }

    // Get existing stations and candidates in region
    const existingStations = await base44.entities.Station.list();
    const existingCandidates = await base44.entities.StationCandidate.list();

    const candidates = [];
    const deduped = [];
    const skipped = [];

    for (const place of gpData.results) {
      const placeId = place.place_id;
      const placeName = place.name;
      const placeLocation = place.geometry.location;

      // First: Check if exact same candidate already exists
      const existingCandidate = existingCandidates.find(c => 
        c.sourceStationId === placeId && c.sourceName === 'GooglePlaces'
      );
      if (existingCandidate) {
        skipped.push({
          placeId,
          placeName,
          reason: 'already_in_candidates',
          existingCandidateId: existingCandidate.id,
        });
        continue;
      }

      // Second: Check for duplicates in existing stations
      let matchCandidates = [];
      let bestMatchConfidence = 0;
      let bestMatchDistance = Infinity;

      for (const station of existingStations) {
        const dist = calculateDistance(placeLocation.lat, placeLocation.lng, station.latitude || 0, station.longitude || 0);

        // Exact match: < 100m
        if (dist < 0.1) {
          matchCandidates = [station.id];
          bestMatchConfidence = 1;
          bestMatchDistance = dist;
          break;
        }

        // Probable match: same chain + name similarity > 85% + distance < 500m
        if (dist < 0.5) {
          const nameSim = stringSimilarity(placeName, station.name);
          const chainMatch = !station.chain || station.chain === place.name.split(' ')[0];

          if (nameSim > 0.85 && chainMatch) {
            if (!matchCandidates.includes(station.id)) {
              matchCandidates.push(station.id);
            }
            bestMatchConfidence = Math.max(bestMatchConfidence, nameSim * 0.8);
            bestMatchDistance = Math.min(bestMatchDistance, dist);
          }
        }
      }

      if (bestMatchConfidence > 0.7) {
        // Likely duplicate of existing station
        deduped.push({
          placeId,
          placeName,
          matchedStations: matchCandidates,
          confidence: bestMatchConfidence,
        });
      } else {
        // New candidate
        candidates.push({
          sourceName: 'GooglePlaces',
          sourceStationId: placeId,
          proposedName: placeName,
          proposedChain: null,
          latitude: placeLocation.lat,
          longitude: placeLocation.lng,
          address: place.vicinity || null,
          matchCandidates,
          matchConfidence: bestMatchConfidence,
          status: 'pending',
          region: 'Trondheim',
        });
      }
    }

    // Create candidates in database
    const createdCandidates = [];
    for (const candidate of candidates) {
      const created = await base44.entities.StationCandidate.create(candidate);
      createdCandidates.push(created);
    }

    return Response.json({
      gpResultsCount: gpData.results.length,
      candidatesCreated: createdCandidates.length,
      dedupedCount: deduped.length,
      skippedCount: skipped.length,
      candidates: createdCandidates,
      deduped,
      skipped,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});