import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Haversine distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Normalize station name for comparison
function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Fetch stations from Overpass API for Trondheim/Trøndelag
async function fetchOSMStations() {
  // Trondheim bounding box (approx)
  // Trøndelag is slightly larger, but we start with Trondheim
  const bbox = '63.38,10.35,63.50,10.55'; // Trondheim area

  const overpassQuery = `
    [bbox:${bbox}];
    (
      node["amenity"="fuel"];
      way["amenity"="fuel"];
    );
    out center;
  `;

  const url = 'https://overpass-api.de/api/interpreter?output=json';
  
  console.log('[importOSMStations] Querying Overpass API for fuel stations in Trondheim...');
  
  const response = await fetch(url, {
    method: 'POST',
    body: overpassQuery,
    timeout: 30000,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`[importOSMStations] Overpass returned ${data.elements?.length || 0} elements`);

  // Normalize to list of stations with lat/lon
  const stations = [];
  if (data.elements) {
    for (const elem of data.elements) {
      const name = elem.tags?.name || elem.tags?.brand || 'Unknown Station';
      const lat = elem.lat !== undefined ? elem.lat : elem.center?.lat;
      const lon = elem.lon !== undefined ? elem.lon : elem.center?.lon;
      const brand = elem.tags?.brand;

      if (lat && lon) {
        stations.push({
          name,
          chain: brand || null,
          latitude: lat,
          longitude: lon,
          city: 'Trondheim', // Default for this import
          region: 'Trøndelag',
          sourceName: 'OpenStreetMap',
          sourceStationId: `osm_${elem.id}`,
          normalizedName: normalizeName(name),
        });
      }
    }
  }

  return stations;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin can import
    if (user?.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    console.log('[importOSMStations] Starting import for user:', user.email);

    // Fetch OSM data
    const osmStations = await fetchOSMStations();
    console.log(`[importOSMStations] Found ${osmStations.length} stations from OSM`);

    // Fetch existing stations for deduplication
    const existingStations = await base44.asServiceRole.entities.Station.list();
    console.log(`[importOSMStations] Database has ${existingStations.length} existing stations`);

    // Deduplicate
    const newStations = [];
    const duplicates = [];

    for (const osmStation of osmStations) {
      let isDuplicate = false;

      for (const existing of existingStations) {
        const existingNormalized = normalizeName(existing.name);
        const distance = calculateDistance(
          osmStation.latitude,
          osmStation.longitude,
          existing.latitude || 0,
          existing.longitude || 0
        );

        // If names match and distance < 200m, likely duplicate
        if (osmStation.normalizedName === existingNormalized && distance < 0.2) {
          isDuplicate = true;
          duplicates.push({
            osmName: osmStation.name,
            existingName: existing.name,
            distance: distance.toFixed(3),
          });
          break;
        }
      }

      if (!isDuplicate) {
        newStations.push(osmStation);
      }
    }

    console.log(`[importOSMStations] Identified ${newStations.length} new stations, ${duplicates.length} duplicates`);

    // Import new stations
    const imported = [];
    for (const station of newStations) {
      const created = await base44.asServiceRole.entities.Station.create({
        name: station.name,
        chain: station.chain,
        latitude: station.latitude,
        longitude: station.longitude,
        city: station.city,
        region: station.region,
        sourceName: station.sourceName,
        sourceStationId: station.sourceStationId,
        normalizedName: station.normalizedName,
        address: null, // OSM doesn't always have address details
      });
      imported.push(created);
    }

    console.log(`[importOSMStations] Successfully created ${imported.length} station records`);

    // Report total coverage
    const allStationsAfter = await base44.asServiceRole.entities.Station.list();
    const trondheimCount = allStationsAfter.filter(
      s => s.city === 'Trondheim' || s.region === 'Trøndelag'
    ).length;

    return Response.json({
      success: true,
      osmStationsFound: osmStations.length,
      existingStationsInDB: existingStations.length,
      newStationsImported: imported.length,
      duplicatesSkipped: duplicates.length,
      totalStationsAfterImport: allStationsAfter.length,
      trondheimTradelagCount: trondheimCount,
      duplicates: duplicates.slice(0, 10), // Show first 10 for inspection
      message: `Imported ${imported.length} new stations from OpenStreetMap (Trondheim). Database now has ${allStationsAfter.length} total stations.`,
    });
  } catch (error) {
    console.error('[importOSMStations] Error:', error.message);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});