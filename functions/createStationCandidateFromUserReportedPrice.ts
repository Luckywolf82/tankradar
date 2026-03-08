import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase()
    .trim()
    .replace(/[-\s]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function levenshteinSimilarity(str1, str2) {
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  
  const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = dp[len1][len2];
  return 1 - (distance / maxLen);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Return in meters
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { 
      station_name,
      station_chain,
      city,
      gps_lat,
      gps_lon,
      google_place_id
    } = payload;

    // Validate required fields
    if (!station_name || gps_lat === undefined || gps_lon === undefined) {
      return Response.json({ 
        error: 'Missing required fields: station_name, gps_lat, gps_lon' 
      }, { status: 400 });
    }

    // === DEDUPLICATION: Check existing Station ===
    const allStations = await base44.asServiceRole.entities.Station.list();
    const nameNorm = normalize(station_name);
    
    for (const station of allStations) {
      const stationNameNorm = normalize(station.name);
      const similarity = levenshteinSimilarity(nameNorm, stationNameNorm);
      const distance = haversineDistance(gps_lat, gps_lon, station.latitude || 0, station.longitude || 0);
      
      // Conservative match: very similar name + very close distance
      if (similarity >= 0.85 && distance <= 100) {
        return Response.json({
          status: 'already_exists_in_station',
          stationId: station.id,
          message: 'Station already exists in catalog'
        });
      }
    }

    // === DEDUPLICATION: Check existing StationCandidate ===
    const existingCandidates = await base44.asServiceRole.entities.StationCandidate.list();
    
    for (const candidate of existingCandidates) {
      // Match by googlePlaceId if available
      if (google_place_id && candidate.sourceStationId === google_place_id) {
        return Response.json({
          status: 'candidate_already_exists',
          candidateId: candidate.id,
          message: 'Candidate with this googlePlaceId already pending'
        });
      }
      
      // Match by name similarity + distance
      const candNameNorm = normalize(candidate.proposedName);
      const similarity = levenshteinSimilarity(nameNorm, candNameNorm);
      const distance = haversineDistance(gps_lat, gps_lon, candidate.latitude || 0, candidate.longitude || 0);
      
      if (similarity >= 0.85 && distance <= 100 && candidate.status === 'pending') {
        return Response.json({
          status: 'candidate_already_exists',
          candidateId: candidate.id,
          message: 'Similar candidate already pending'
        });
      }
    }

    // === CREATE StationCandidate ===
    const newCandidate = {
      sourceName: 'user_price_submission',
      sourceStationId: google_place_id || null,
      proposedName: station_name,
      proposedChain: station_chain || null,
      latitude: gps_lat,
      longitude: gps_lon,
      address: null, // Not available from user submission
      matchCandidates: [],
      matchConfidence: 0.30, // Low confidence - only user observation
      status: 'pending',
      region: city || null,
      notes: `Candidate created from user price submission. Chain: "${station_chain || 'unknown'}"`
    };

    const created = await base44.asServiceRole.entities.StationCandidate.create(newCandidate);

    return Response.json({
      status: 'candidate_created',
      candidateId: created.id,
      message: 'New station candidate created from user submission'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});