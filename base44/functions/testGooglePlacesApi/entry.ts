import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Test locations in Norway – multi-city coverage analysis
const TEST_LOCATIONS = {
  oslo: {
    latitude: 59.9139,
    longitude: 10.7522,
    name: "Oslo sentrum",
    radiusMeters: 5000
  },
  trondheim: {
    latitude: 63.4305,
    longitude: 10.3951,
    name: "Trondheim sentrum",
    radiusMeters: 5000
  },
  bergen: {
    latitude: 60.3895,
    longitude: 5.3221,
    name: "Bergen sentrum",
    radiusMeters: 5000
  },
  stavanger: {
    latitude: 58.9701,
    longitude: 5.7331,
    name: "Stavanger sentrum",
    radiusMeters: 5000
  }
};

async function testNearbySearch(apiKey, location, pageToken = null) {
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
  
  if (pageToken) {
    body.pageToken = pageToken;
  }

  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.fuelOptions,places.businessStatus"
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

    // Analyze fuelOptions coverage (stations with actual price data)
    const stationsWithFuelOptions = places.filter(p => p.fuelOptions && Object.keys(p.fuelOptions).length > 0);
    
    // Extract all observed fuel types and chains (brand from name or displayName)
    const allFuelTypes = new Set();
    const allChains = new Set();
    
    stationsWithFuelOptions.forEach(p => {
      Object.keys(p.fuelOptions).forEach(type => allFuelTypes.add(type));
      // Try to infer chain from display name (simple heuristic)
      const name = p.displayName?.text || "";
      if (name.includes("Circle K")) allChains.add("Circle K");
      if (name.includes("Uno-X")) allChains.add("Uno-X");
      if (name.includes("ESSO") || name.includes("Esso")) allChains.add("ESSO");
      if (name.includes("Shell")) allChains.add("Shell");
      if (name.includes("Statoil")) allChains.add("Statoil");
      if (name.includes("Fortum")) allChains.add("Fortum");
    });

    // Find sample station WITH fuelOptions
    const sampleWithFuel = stationsWithFuelOptions[0];
    const sampleStation = sampleWithFuel || places[0];

    return {
      success: true,
      location: location.name,
      totalStationsReturned: places.length,
      stationsWithPriceData: stationsWithFuelOptions.length,
      observedCoverage: places.length > 0 ? ((stationsWithFuelOptions.length / places.length) * 100).toFixed(1) : 0,
      observedFuelTypes: Array.from(allFuelTypes).sort(),
      observedChains: Array.from(allChains).sort(),
      sampleStationWithPrices: sampleStation ? {
        id: sampleStation.id,
        displayName: sampleStation.displayName?.text,
        address: sampleStation.formattedAddress,
        location: sampleStation.location,
        fuelOptions: sampleStation.fuelOptions || null
      } : null
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

    // Summary: Analyze GooglePlaces as potential price source
    const allSucceeded = Object.values(results.locations).every(r => r.success === true);
    
    if (allSucceeded) {
      const totalStationsReturned = Object.values(results.locations).reduce((sum, r) => sum + (r.totalStationsReturned || 0), 0);
      const totalStationsWithPrices = Object.values(results.locations).reduce((sum, r) => sum + (r.stationsWithPriceData || 0), 0);
      const allFuelTypes = new Set();
      const allChains = new Set();
      
      Object.values(results.locations).forEach(r => {
        if (r.observedFuelTypes) {
          r.observedFuelTypes.forEach(t => allFuelTypes.add(t));
        }
        if (r.observedChains) {
          r.observedChains.forEach(c => allChains.add(c));
        }
      });

      const overallCoverage = totalStationsReturned > 0 
        ? ((totalStationsWithPrices / totalStationsReturned) * 100).toFixed(1) 
        : 0;

      results.summary = {
        testPeriod: "Multi-city verification (Oslo, Trondheim, Bergen, Stavanger)",
        totalStationsFound: totalStationsReturned,
        stationsWithPriceData: totalStationsWithPrices,
        overallCoveragePercent: overallCoverage,
        allObservedFuelTypes: Array.from(allFuelTypes).sort(),
        allObservedChains: Array.from(allChains).sort(),
        assessment: {
          role: totalStationsWithPrices > totalStationsReturned * 0.5 ? "supplement_or_partial" : "verification_only",
          recommendation: overallCoverage >= 50 
            ? "GooglePlaces could serve as supplement source (use with confidence 0.6-0.8)"
            : "GooglePlaces limited for price data – consider verification role only",
          nextStep: "Parser validate FuelPrice schema + implement mapping from fuelOptions to standardized fuel types"
        }
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