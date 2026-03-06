import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * captureRawGooglePlacesResponse
 * 
 * Captures and logs RAW, UNMODIFIED Google Places API responses.
 * Goal: Prove what units, nanos, currencyCode actually contain.
 * 
 * This is a diagnostic function - no parsing, no transformation, no storage.
 * Just capture what Google sends and report it verbatim.
 */

const TEST_LOCATION = {
  latitude: 59.9139,
  longitude: 10.7522,
  name: "Oslo sentrum",
  radiusMeters: 5000
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return Response.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 500 });
    }

    const url = "https://places.googleapis.com/v1/places:searchNearby";
    
    const body = {
      includedTypes: ["gas_station"],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: TEST_LOCATION.latitude, longitude: TEST_LOCATION.longitude },
          radius: TEST_LOCATION.radiusMeters
        }
      }
    };

    const headers = {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.fuelOptions"
    };

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return Response.json({ 
        error: `Google API returned ${response.status}`,
        status: response.status
      }, { status: response.status });
    }

    const rawData = await response.json();

    // Extract up to 3 gas stations with fuel prices for detailed inspection
    const examplesWithFuel = [];
    
    if (rawData.places && Array.isArray(rawData.places)) {
      for (const place of rawData.places) {
        if (examplesWithFuel.length >= 3) break;
        
        if (place.fuelOptions && place.fuelOptions.fuelPrices && place.fuelOptions.fuelPrices.length > 0) {
          examplesWithFuel.push({
            placeId: place.id,
            displayName: place.displayName?.text || "(unnamed)",
            location: place.location,
            fuelOptions: {
              count: place.fuelOptions.fuelPrices.length,
              fuelPrices: place.fuelOptions.fuelPrices.map(fp => ({
                type: fp.type,
                price: {
                  currencyCode: fp.price?.currencyCode,
                  units: fp.price?.units,
                  nanos: fp.price?.nanos
                },
                updateTime: fp.updateTime
              }))
            }
          });
        }
      }
    }

    // Return the RAW response structures
    return Response.json({
      diagnostic: "RAW GOOGLE PLACES API RESPONSE - UNMODIFIED",
      requestLocation: TEST_LOCATION,
      totalPlacesReturned: rawData.places?.length || 0,
      placesWithFuelData: examplesWithFuel.length,
      
      rawExamples: examplesWithFuel,
      
      // Additional analysis section
      analysis: {
        note: "Units and nanos are copied EXACTLY as Google returned them. No transformation applied.",
        sampleInterpretations: examplesWithFuel.map((ex, idx) => ({
          exampleIndex: idx + 1,
          displayName: ex.displayName,
          interpretation: {
            question: `Are units=${ex.fuelOptions.fuelPrices[0]?.price?.units} in øre or NOK?`,
            currentAssumption: "Unknown - requires Google documentation",
            possibleScenarios: [
              {
                scenario: "units = whole NOK, nanos = 10^-9 NOK fraction",
                example: `units:${ex.fuelOptions.fuelPrices[0]?.price?.units} + nanos:${ex.fuelOptions.fuelPrices[0]?.price?.nanos} / 1e9 = ???`
              },
              {
                scenario: "units = øre (1/100 NOK), nanos = sub-øre",
                example: `units:${ex.fuelOptions.fuelPrices[0]?.price?.units} / 100 = ???`
              }
            ]
          }
        }))
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});