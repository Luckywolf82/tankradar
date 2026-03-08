import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Return in meters
}

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase()
    .trim()
    .replace(/[-\s]+/g, ' ') // Normalize hyphens/spaces
    .replace(/\s+/g, ' '); // Multiple spaces to single
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

function classifyDistance(meters) {
  if (meters <= 100) return 'close';
  if (meters <= 300) return 'uncertain';
  return 'far';
}

function matchChain(scanChain, stationChain) {
  if (!scanChain || scanChain === '') return 'missing';
  if (scanChain === stationChain) return 'match';
  return 'mismatch';
}

function startsWithSameChain(norm1, norm2, stationChain) {
  if (!stationChain) return false;
  const chainNorm = normalize(stationChain);
  return norm1.startsWith(chainNorm) && norm2.startsWith(chainNorm);
}

function shortNameContained(norm1, norm2) {
  if (norm1.length > 15) return false; // Only for short names
  return norm2.includes(norm1) && norm1.length > 2;
}

function matchNames(scanName, stationName, stationChain) {
  if (!scanName || scanName === '') return 'missing';
  
  const norm1 = normalize(scanName);
  const norm2 = normalize(stationName);
  
  if (norm1 === norm2) return 'exact';
  
  const levScore = levenshteinSimilarity(norm1, norm2);
  if (levScore >= 0.75) return 'similar';
  
  if (startsWithSameChain(norm1, norm2, stationChain)) return 'same_chain';
  
  if (shortNameContained(norm1, norm2)) return 'contained';
  
  return 'mismatch';
}

function calculateMatchScore(distClass, chainMatch, nameMatch, cityMatch, scanChain) {
  let score = 0;
  
  // Distance points
  if (distClass === 'close') score += 30;
  if (distClass === 'uncertain') score += 10;
  if (distClass === 'far') return 0;
  
  // Chain points
  if (chainMatch === 'match') score += 25;
  if (chainMatch === 'mismatch') return 0;
  
  // Name points (ADJUSTED: same_chain and contained are support signals only)
  if (nameMatch === 'exact') score += 30;
  if (nameMatch === 'similar') score += 20;
  if (nameMatch === 'same_chain') score += 15; // Support signal, but strengthened for close+chain
  if (nameMatch === 'contained') score += 10; // Support signal, but strengthened for close+chain
  if (nameMatch === 'mismatch') return 0; // Hard block: mismatch with chain=match is too risky
  
  // City points (support)
  if (cityMatch) score += 10;
  
  // Missing chain penalty
  if (!scanChain || scanChain === '') {
    score -= 10; // Harsher penalty for missing chain
  }
  
  return score;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { gps_lat, gps_lon, station_name, station_chain, city, latitude, longitude } = payload;

    // Use selected station coordinates if available, otherwise fall back to GPS
    const matchLat = latitude !== undefined ? latitude : gps_lat;
    const matchLon = longitude !== undefined ? longitude : gps_lon;

    if (matchLat === undefined || matchLon === undefined || !city) {
      return Response.json({ 
        error: 'Missing required fields: latitude/longitude (or gps_lat/gps_lon), city' 
      }, { status: 400 });
    }

    // Fetch stations in same city
    const candidates = await base44.entities.Station.filter({ city });

    if (!candidates || candidates.length === 0) {
      return Response.json({
        status: 'no_safe_station_match',
        stationId: null,
        candidates: [],
        reason: 'No stations found in city'
      });
    }

    // Score all candidates using selected station coordinates
    const scoredMatches = candidates
      .map(station => {
        const dist = haversineDistance(matchLat, matchLon, station.latitude, station.longitude);
        const distClass = classifyDistance(dist);
        
        const chainMatch = matchChain(station_chain, station.chain);
        const nameMatch = matchNames(station_name, station.name, station.chain);
        const cityMatch = station.city === city;
        
        const score = calculateMatchScore(distClass, chainMatch, nameMatch, cityMatch, station_chain);
        
        return {
          station,
          score,
          dist,
          distClass,
          chainMatch,
          nameMatch,
          cityMatch
        };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score);

    // SCORE_MATCHED threshold
    const SCORE_MATCHED = 65;
    const SCORE_REVIEW_THRESHOLD = 35;

    if (scoredMatches.length === 0) {
      return Response.json({
        status: 'no_safe_station_match',
        stationId: null,
        candidates: [],
        reason: 'No candidates passed scoring threshold'
      });
    }

    const topMatch = scoredMatches[0];

    // Single strong match (high confidence)
    if (topMatch.score >= SCORE_MATCHED) {
      return Response.json({
        status: 'matched_station_id',
        stationId: topMatch.station.id,
        candidates: [topMatch.station.id],
        score: topMatch.score,
        matchDetails: {
          dist: Math.round(topMatch.dist),
          distClass: topMatch.distClass,
          chainMatch: topMatch.chainMatch,
          nameMatch: topMatch.nameMatch,
          cityMatch: topMatch.cityMatch
        }
      });
    }

    // Review needed: has some signal but not strong enough for auto-match
    if (topMatch.score >= SCORE_REVIEW_THRESHOLD) {
      return Response.json({
        status: 'review_needed_station_match',
        stationId: null,
        candidates: scoredMatches.slice(0, 3).map(m => m.station.id),
        topScore: topMatch.score,
        reasons: scoredMatches.slice(0, 3).map(m => ({
          stationId: m.station.id,
          stationName: m.station.name,
          score: m.score,
          dist: Math.round(m.dist),
          distClass: m.distClass,
          chainMatch: m.chainMatch,
          nameMatch: m.nameMatch,
          cityMatch: m.cityMatch
        }))
      });
    }

    // No safe match
    return Response.json({
      status: 'no_safe_station_match',
      stationId: null,
      candidates: [],
      reason: 'No candidates passed review threshold'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});