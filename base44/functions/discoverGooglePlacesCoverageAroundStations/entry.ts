import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

    // Search Google Places for gas stations nearby
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${latitude},${longitude}`);
    url.searchParams.set('radius', radiusMeters.toString());
    url.searchParams.set('type', 'gas_station');
    url.searchParams.set('key', apiKey);

    const gpResponse = await fetch(url.toString());
    const gpData = await gpResponse.json();

    if (!gpData.results) {
      return Response.json({ 
        results: [],
        sourceStationId: stationId,
        searchPoint: { latitude, longitude },
        radiusKm 
      });
    }

    // Fetch all stations to check for existing matches
    const allStations = await base44.asServiceRole.entities.Station.list();

    // Match each Google Places result against our stations
    const enrichedResults = gpData.results.map(place => {
      const placeLocation = place.geometry.location;
      
      // Simple distance calculation (Haversine formula)
      const distance = calculateDistance(
        latitude, longitude,
        placeLocation.lat, placeLocation.lng
      );

      // Try to find matching station in our catalog
      const matchedStation = findClosestMatch(allStations, place, distance);

      return {
        googlePlacesId: place.place_id,
        name: place.name,
        address: place.vicinity,
        latitude: placeLocation.lat,
        longitude: placeLocation.lng,
        distance,
        businessStatus: place.business_status,
        hasGeoLocation: place.geometry ? true : false,
        matchedStationId: matchedStation?.id,
        matchedStationName: matchedStation?.name,
        matchDistance: matchedStation?.distance,
        matchConfidence: matchedStation?.confidence,
      };
    });

    return Response.json({
      results: enrichedResults,
      sourceStationId: stationId,
      searchPoint: { latitude, longitude },
      radiusKm,
      resultsCount: enrichedResults.length,
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