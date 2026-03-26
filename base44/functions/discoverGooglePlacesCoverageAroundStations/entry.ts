import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Geometry & Distance (production-aligned)
const GEO_R = 6371000;
function toRad(d) { return d * Math.PI / 180; }
function distMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return GEO_R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── GP API — production-aligned (v1 places:searchNearby)
async function fetchGPForPoint(apiKey, latitude, longitude, radiusMeters) {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.fuelOptions',
      },
      body: JSON.stringify({
        includedTypes: ['gas_station'],
        maxResultCount: 20,
        locationRestriction: {
          circle: { center: { latitude, longitude }, radius: radiusMeters },
        },
      }),
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}`, places: [] };
    const data = await res.json();
    return { success: true, places: data.places || [] };
  } catch (err) {
    return { success: false, error: err.message, places: [] };
  }
}

// ── Station matching — production-aligned (500m radius, chain-based)
function matchStation(googlePlace, allStations) {
  const gName = googlePlace.displayName?.text || '';
  const gLat = googlePlace.location?.latitude;
  const gLon = googlePlace.location?.longitude;
  if (!gLat || !gLon) return null;

  const lower = gName.toLowerCase();
  let chain = null;
  if (lower.includes('circle k')) chain = 'circle k';
  else if (lower.includes('uno') && lower.includes('x')) chain = 'uno x';
  else if (lower.includes('esso')) chain = 'esso';
  else if (lower.includes('shell')) chain = 'shell';
  else if (lower.includes('statoil')) chain = 'statoil';
  else if (lower.includes('st1')) chain = 'st1';
  if (!chain) return null;

  let best = null, bestDist = Infinity;
  const MATCH_RADIUS = 500;

  for (const s of allStations) {
    if (!s.latitude || !s.longitude || !s.chain) continue;
    const d = distMeters(gLat, gLon, s.latitude, s.longitude);
    if (d > MATCH_RADIUS) continue;
    const sChain = (s.chain || '').toLowerCase().replace(/[-\s]+/g, ' ');
    if (sChain !== chain) continue;
    
    let conf = 0;
    if (d < 50) conf = gName.toLowerCase().includes((s.name || '').toLowerCase()) ? 0.90 : 0.85;
    else if (d < 150) conf = 0.80;
    else if (d < 300) conf = 0.65;
    else conf = 0.55;
    
    if (d < bestDist) { best = { station: s, distanceMeters: d, confidence: conf }; bestDist = d; }
  }
  return best;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { latitude, longitude, radiusKm, stationId } = await req.json();

    if (!latitude || !longitude || radiusKm === undefined) {
      return Response.json({ error: 'Missing latitude, longitude, or radiusKm' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Google Places API key not configured' }, { status: 500 });
    }

    const radiusMeters = radiusKm * 1000;

    // ── LIVE GP RESULT ──
    const gpResult = await fetchGPForPoint(apiKey, latitude, longitude, radiusMeters);
    if (!gpResult.success) {
    return Response.json({
      live: {
        gpReachableNow: false,
        gpMatchedNow: false,
        resultsCount: 0,
        liveFuelDataFoundNow: false,
        liveFuelTypes: [],
        liveSourceUpdatedAt: null,
      },
      stored: {
        storedGpPrices: false,
        storedFuelTypes: [],
        lastStoredFetchedAt: null,
        lastStoredSourceUpdatedAt: null,
      },
      persistence: {
        newFuelPriceRowsCreated: false,
        rowsCreatedCount: 0,
        reasonIfNoRowsCreated: `GP not reachable: ${gpResult.error}`,
      },
    });
    }

    const places = gpResult.places || [];
    const allStations = await base44.entities.Station.filter({ status: 'active' });
    
    let gpMatchedNow = false;
    let liveFuelDataFoundNow = false;
    let liveFuelTypes = [];
    let liveSourceUpdatedAt = null;
    let matchedPlace = null;

    for (const place of places) {
      const match = matchStation(place, allStations);
      if (match && match.station.id === stationId) {
        gpMatchedNow = true;
        matchedPlace = place;
        const fuelOptions = place.fuelOptions?.fuelPrices || [];
        if (fuelOptions.length > 0) {
          liveFuelDataFoundNow = true;
          liveFuelTypes = [...new Set(fuelOptions.map(f => f.type).filter(Boolean))];
          liveSourceUpdatedAt = fuelOptions[0]?.updateTime || null;
        }
        break;
      }
    }

    // ── STORED DB RESULT ──
    const gpPricesStored = await base44.entities.FuelPrice.filter({ sourceName: 'GooglePlaces', stationId: stationId });
    const storedGpPrices = gpPricesStored.length > 0;
    const storedFuelTypes = [...new Set(gpPricesStored.map(p => p.fuelType).filter(Boolean))];
    const lastStoredFetchedAt = storedGpPrices ? gpPricesStored.sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt))[0].fetchedAt : null;
    const lastStoredSourceUpdatedAt = storedGpPrices ? gpPricesStored.sort((a, b) => new Date(b.sourceUpdatedAt || 0) - new Date(a.sourceUpdatedAt || 0))[0].sourceUpdatedAt : null;

    // ── PERSISTENCE RESULT ──
    // For now (test-only): record what WOULD have been created if we persisted
    // Don't actually persist — that's the production function's job
    const newFuelPriceRowsCreated = false;
    const rowsCreatedCount = 0;
    let reasonIfNoRowsCreated = null;

    if (!gpMatchedNow) {
      reasonIfNoRowsCreated = 'No GP match found for this station within 500m.';
    } else if (!liveFuelDataFoundNow) {
      reasonIfNoRowsCreated = 'GP match found but returned no fuel price data.';
    }

    return Response.json({
      live: {
        gpReachableNow: true,
        gpMatchedNow,
        resultsCount: places.length,
        liveFuelDataFoundNow,
        liveFuelTypes,
        liveSourceUpdatedAt,
      },
      stored: {
        storedGpPrices,
        storedFuelTypes,
        lastStoredFetchedAt,
        lastStoredSourceUpdatedAt,
      },
      persistence: {
        newFuelPriceRowsCreated,
        rowsCreatedCount,
        reasonIfNoRowsCreated,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
}

function findClosestMatch(stations, googlePlace, gpSearchDistance) {
  let bestMatch = null;
  let bestScore = 0;

  for (const station of stations) {
    if (!station.latitude || !station.longitude) continue;

    const stationDistance = calculateDistance(
      station.latitude, station.longitude,
      googlePlace.geometry.location.lat, googlePlace.geometry.location.lng
    );

    // Simple matching: name similarity + distance
    const nameSimilarity = calculateStringSimilarity(
      googlePlace.name.toLowerCase(),
      station.name.toLowerCase()
    );

    // Prefer matches closer than 200m with decent name match
    let score = 0;
    if (stationDistance < 0.2) {
      score = nameSimilarity * 100;
    } else if (stationDistance < 0.5) {
      score = nameSimilarity * 50;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        id: station.id,
        name: station.name,
        distance: stationDistance,
        confidence: bestScore > 70 ? 'high' : bestScore > 50 ? 'medium' : 'low',
      };
    }
  }

  return bestMatch;
}

function calculateStringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null)
  );

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
}