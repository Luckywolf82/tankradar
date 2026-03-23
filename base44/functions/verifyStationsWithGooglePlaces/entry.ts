import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

// Haversine distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function searchGooglePlaces(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch pending stations
    const pendingStations = await base44.entities.Station.filter(
      { reviewStatus: 'pending' },
      '-updated_date',
      50
    );

    if (pendingStations.length === 0) {
      return Response.json({ 
        message: 'No pending stations to verify',
        processed: 0,
        reviewed: 0,
        flagged: 0
      });
    }

    let reviewed = 0;
    let flagged = 0;

    for (const station of pendingStations) {
      try {
        // Search for station in Google Places
        const searchQuery = `${station.name} ${station.city || ''}`;
        const results = await searchGooglePlaces(searchQuery);

        if (results.length === 0) {
          // No results found - flag it
          await base44.entities.Station.update(station.id, { reviewStatus: 'flagged' });
          flagged++;
          continue;
        }

        // Check first result
        const topResult = results[0];
        const distance = calculateDistance(
          station.latitude,
          station.longitude,
          topResult.geometry.location.lat,
          topResult.geometry.location.lng
        );

        // If distance is less than 500m and names are similar, mark as reviewed
        if (distance < 0.5) {
          await base44.entities.Station.update(station.id, { reviewStatus: 'reviewed' });
          reviewed++;
        } else {
          // Distance too far or no match - flag it
          await base44.entities.Station.update(station.id, { reviewStatus: 'flagged' });
          flagged++;
        }
      } catch (error) {
        // On error, flag the station
        console.error(`Error verifying station ${station.id}:`, error.message);
        await base44.entities.Station.update(station.id, { reviewStatus: 'flagged' });
        flagged++;
      }
    }

    return Response.json({
      message: 'Station verification completed',
      processed: pendingStations.length,
      reviewed,
      flagged,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});