import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

async function testStationGooglePlacesCoverage(station) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${station.latitude},${station.longitude}&radius=1000&type=gas_station&fields=business_status,formatted_address,name,photos,place_id,geometry,opening_hours,editorial_summary&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return {
        stationId: station.id,
        hasGPMatch: false,
        hasFuelOptions: false,
        gpName: null,
      };
    }

    const result = data.results[0];
    const distance = Math.sqrt(
      Math.pow(result.geometry.location.lat - station.latitude, 2) +
      Math.pow(result.geometry.location.lng - station.longitude, 2)
    ) * 111; // Rough km conversion

    return {
      stationId: station.id,
      hasGPMatch: true,
      distance: distance,
      gpName: result.name,
      businessStatus: result.business_status || 'UNKNOWN',
      gpPlaceId: result.place_id,
      hasFuelOptions: !!result.fuelOptions, // GP API may or may not include this
    };
  } catch (error) {
    console.error(`Error testing station ${station.id}:`, error.message);
    return {
      stationId: station.id,
      hasGPMatch: false,
      hasFuelOptions: false,
      error: error.message,
    };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { limit = 50, offset = 0 } = await req.json().catch(() => ({}));

    // Load stations
    const stations = await base44.entities.Station.list('-created_date', limit, offset);
    
    if (stations.length === 0) {
      return Response.json({
        success: true,
        tested: 0,
        results: [],
        hasMore: false,
      });
    }

    // Test each station
    const results = [];
    for (const station of stations) {
      const testResult = await testStationGooglePlacesCoverage(station);
      results.push(testResult);
    }

    // Count results
    const withMatch = results.filter(r => r.hasGPMatch).length;
    const withFuelOptions = results.filter(r => r.hasFuelOptions).length;

    return Response.json({
      success: true,
      tested: results.length,
      withMatch,
      withFuelOptions,
      results,
      nextOffset: offset + results.length,
    });
  } catch (error) {
    console.error('Batch test failed:', error);
    return Response.json({ 
      error: error.message,
      success: false,
    }, { status: 500 });
  }
});