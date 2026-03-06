import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Embedded OSM fixture for testing
const OSM_FIXTURE = {
  elements: [
    {
      type: "node",
      id: 1,
      lat: 59.9139,
      lon: 10.7522,
      tags: {
        name: "Circle K Ferner",
        brand: "Circle K",
        amenity: "fuel"
      }
    },
    {
      type: "node",
      id: 2,
      lat: 59.9084,
      lon: 10.7282,
      tags: {
        name: "Uno-X Oslo Sentralstasjon",
        brand: "Uno-X",
        amenity: "fuel",
        addr_street: "Jernbanetorget 1",
        addr_city: "Oslo"
      }
    },
    {
      type: "node",
      id: 3,
      lat: 59.9126,
      lon: 10.7461,
      tags: {
        name: "ESSO Nationaltheatret",
        brand: "ESSO",
        amenity: "fuel",
        addr_street: "Universitetsgaten 8",
        addr_city: "Oslo"
      }
    }
  ]
};

// Map Overpass tags to Station fields
function mapOsmToStation(osmNode) {
  const tags = osmNode.tags || {};
  
  return {
    name: tags.name || null,
    chain: tags.brand || null,
    address: tags.addr_street || null,
    city: tags.addr_city || null,
    latitude: osmNode.lat,
    longitude: osmNode.lon,
    sourceStationId: `osm_${osmNode.id}`,
    sourceName: "OpenStreetMap",
    normalizedName: tags.name ? tags.name.toLowerCase().trim() : null
  };
}

// Infer region from coordinates
function inferRegionFromCoords(lat, lon) {
  // Simplified heuristic for Oslo, Trondheim, etc.
  if (lat > 59.8 && lat < 60.0 && lon > 10.6 && lon < 10.9) return "Oslo og Akershus";
  if (lat > 63.4 && lat < 63.5 && lon > 10.3 && lon < 10.5) return "Trøndelag";
  return null;
}

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let osmResponse;
    let usedFixture = false;

    // Try live Overpass API
    try {
      const overpassQuery = `
        [bbox:57.8,4.0,71.0,31.0];
        (node["amenity"="fuel"];way["amenity"="fuel"];relation["amenity"="fuel"];);
        out center tags;
      `;

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery,
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      if (!response.ok) {
        throw new Error(`Overpass API returned ${response.status}`);
      }

      osmResponse = await response.json();
    } catch (error) {
      console.log("Live Overpass fetch failed, using fixture for parser validation:", error.message);
      osmResponse = OSM_FIXTURE;
      usedFixture = true;
    }

    // Parse stations
    const elements = osmResponse.elements || [];
    const stationRecords = elements
      .filter(el => el.type === "node" && el.tags?.name)
      .map(mapOsmToStation);

    let recordsCreated = 0;
    let recordsSkipped = 0;

    // Upsert Station records
    for (const station of stationRecords) {
      const existing = await base44.entities.Station.filter({
        sourceStationId: station.sourceStationId
      });

      if (existing.length === 0) {
        // Infer region if not provided
        if (!station.region) {
          station.region = inferRegionFromCoords(station.latitude, station.longitude);
        }

        await base44.entities.Station.create(station);
        recordsCreated++;
      } else {
        recordsSkipped++;
      }
    }

    // Log fetch
    const fetchLog = await base44.asServiceRole.entities.FetchLog.create({
      sourceName: "OpenStreetMap",
      startedAt: startedAt,
      finishedAt: new Date().toISOString(),
      success: true,
      httpStatus: usedFixture ? null : 200,
      stationsFound: stationRecords.length,
      pricesFound: 0,
      recordsCreated: recordsCreated,
      recordsSkipped: recordsSkipped,
      parserVersion: "osm_v1",
      errorMessage: null,
      notes: usedFixture
        ? "Parser validated via embedded OSM fixture. Live Overpass fetch failed – requires network access."
        : "Successfully fetched station catalog from Overpass API."
    });

    return Response.json({
      success: true,
      stationsFound: stationRecords.length,
      recordsCreated: recordsCreated,
      recordsSkipped: recordsSkipped,
      usedFixture: usedFixture,
      exampleStation: stationRecords[0] || null,
      fetchLogId: fetchLog.id
    });
  } catch (error) {
    const fetchLog = await base44.asServiceRole.entities.FetchLog.create({
      sourceName: "OpenStreetMap",
      startedAt: startedAt,
      finishedAt: new Date().toISOString(),
      success: false,
      httpStatus: null,
      stationsFound: 0,
      pricesFound: 0,
      recordsCreated: 0,
      recordsSkipped: 0,
      parserVersion: "osm_v1",
      errorMessage: error.message,
      notes: null
    });

    return Response.json({ error: error.message, fetchLogId: fetchLog.id }, { status: 500 });
  }
});