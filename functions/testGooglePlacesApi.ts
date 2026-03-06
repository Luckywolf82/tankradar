import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Test locations in Norway
const TEST_LOCATIONS = {
  trondheim: {
    latitude: 63.4305,
    longitude: 10.3951,
    name: "Trondheim sentrum",
    radiusMeters: 5000
  },
  oslo: {
    latitude: 59.9139,
    longitude: 10.7522,
    name: "Oslo sentrum",
    radiusMeters: 5000
  }
};

async function testNearbySearch(apiKey, location) {
  const url = "https://places.googleapis.com/v1/places:searchNearby";
  
  const body = {
    includedTypes: ["gas_station"],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        radius: location.radiusMeters
      }
    }
  };

  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.fuelOptions"
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: await response.text(),
        location: location.name
      };
    }

    const data = await response.json();
    const places = data.places || [];

    // Analyze fuelOptions coverage
    const stationsWithFuelOptions = places.filter(p => p.fuelOptions && Object.keys(p.fuelOptions).length > 0);
    const allFuelTypes = new Set();
    
    stationsWithFuelOptions.forEach(p => {
      Object.keys(p.fuelOptions).forEach(type => allFuelTypes.add(type));
    });

    return {
      success: true,
      location: location.name,
      totalStations: places.length,
      stationsWithFuelOptions: stationsWithFuelOptions.length,
      coverage: places.length > 0 ? ((stationsWithFuelOptions.length / places.length) * 100).toFixed(1) : 0,
      fuelTypes: Array.from(allFuelTypes),
      sampleStation: places[0] ? {
        id: places[0].id,
        displayName: places[0].displayName?.text,
        address: places[0].formattedAddress,
        location: places[0].location,
        fuelOptions: places[0].fuelOptions || null,
        updateTime: places[0].updateTime || null
      } : null,
      rawPlacesCount: places.length,
      response: data
    };
  } catch (error) {
    return {
      success: false,
      location: location.name,
      error: error.message
    };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for API key
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return Response.json({
        success: false,
        error: "GOOGLE_PLACES_API_KEY not set",
        instructions: "Set GOOGLE_PLACES_API_KEY in environment variables to test Google Places API",
        requiredScopes: ["places.google.com/Place.Read"],
        billingRequired: true
      }, { status: 400 });
    }

    // Run tests
    const results = {
      timestamp: new Date().toISOString(),
      testPhase: "verification",
      purpose: "Test fuelOptions coverage for gas_station in Norway",
      locations: {}
    };

    for (const [key, location] of Object.entries(TEST_LOCATIONS)) {
      const result = await testNearbySearch(apiKey, location);
      results.locations[key] = result;
    }

    // Summary
    const allSucceeded = Object.values(results.locations).every(r => r.success === true);
    
    if (allSucceeded) {
      const totalStations = Object.values(results.locations).reduce((sum, r) => sum + (r.totalStations || 0), 0);
      const totalWithFuelOptions = Object.values(results.locations).reduce((sum, r) => sum + (r.stationsWithFuelOptions || 0), 0);
      const allFuelTypes = new Set();
      
      Object.values(results.locations).forEach(r => {
        if (r.fuelTypes) {
          r.fuelTypes.forEach(t => allFuelTypes.add(t));
        }
      });

      results.summary = {
        totalStations,
        totalWithFuelOptions,
        overallCoverage: totalStations > 0 ? ((totalWithFuelOptions / totalStations) * 100).toFixed(1) : 0,
        allFuelTypes: Array.from(allFuelTypes),
        conclusion: totalWithFuelOptions > 0 
          ? "fuelOptions IS returned for Norwegian stations" 
          : "fuelOptions NOT returned for Norwegian stations (field may not be supported in this region)"
      };
    } else {
      results.summary = {
        error: "Some requests failed",
        details: Object.entries(results.locations)
          .filter(([_, r]) => !r.success)
          .map(([key, r]) => `${key}: ${r.error}`)
      };
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});