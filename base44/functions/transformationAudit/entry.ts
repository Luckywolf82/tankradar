import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * transformationAudit
 * 
 * Shows EXACTLY what happens from raw Google response to stored FuelPrice.
 * 
 * CHAIN:
 * 1. Raw Google Places API response
 * 2. Parser processes units + nanos
 * 3. Stored in FuelPrice.priceNok
 */

const TEST_LOCATION = {
  latitude: 59.9139,
  longitude: 10.7522,
  name: "Oslo sentrum",
  radiusMeters: 5000
};

// Replicate the EXACT extraction logic from the parser
function extractPriceNok(priceObj) {
  if (!priceObj || priceObj.currencyCode !== "NOK") return null;
  const units = parseInt(priceObj.units) || 0;
  const nanos = parseInt(priceObj.nanos) || 0;
  return units + (nanos / 1e9);
}

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
      "X-Goog-FieldMask": "places.id,places.displayName,places.fuelOptions"
    };

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return Response.json({ error: `Google API: ${response.status}` }, { status: response.status });
    }

    const rawData = await response.json();

    // Build transformation chain for up to 3 examples
    const transformationChain = [];
    
    if (rawData.places && Array.isArray(rawData.places)) {
      for (const place of rawData.places) {
        if (transformationChain.length >= 3) break;
        
        if (place.fuelOptions?.fuelPrices?.length > 0) {
          for (const fuelPrice of place.fuelOptions.fuelPrices) {
            if (transformationChain.length >= 3) break;
            
            const rawPrice = fuelPrice.price;
            const calculatedPrice = extractPriceNok(rawPrice);
            
            transformationChain.push({
              station: place.displayName?.text || "(unnamed)",
              step1_rawGoogleResponse: {
                type: fuelPrice.type,
                price: {
                  currencyCode: rawPrice.currencyCode,
                  units: rawPrice.units,
                  nanos: rawPrice.nanos
                },
                description: `Raw from Google: units="${rawPrice.units}" (whole NOK), nanos="${rawPrice.nanos}" (10^-9 NOK)`
              },
              step2_calculation: {
                formula: "units + (nanos / 1e9)",
                units_parsed: parseInt(rawPrice.units || 0),
                nanos_parsed: parseInt(rawPrice.nanos || 0),
                nanos_as_decimal: parseInt(rawPrice.nanos || 0) / 1e9,
                calculation: `${parseInt(rawPrice.units || 0)} + (${parseInt(rawPrice.nanos || 0)} / 1000000000)`,
                result: calculatedPrice
              },
              step3_storedInDatabase: {
                priceNok: calculatedPrice,
                fuelType: fuelPrice.type === "SP95" ? "gasoline_95" : fuelPrice.type === "SP98" ? "gasoline_98" : "diesel",
                sourceName: "GooglePlaces",
                sourceUpdatedAt: fuelPrice.updateTime,
                fetchedAt: new Date().toISOString()
              }
            });
          }
        }
      }
    }

    return Response.json({
      diagnostic: "TRANSFORMATION CHAIN: Raw Google → Parser → Stored",
      examples: transformationChain,
      
      explanation: {
        googleMoneyFormat: {
          spec: "Google Money type in protobuf format",
          units: "Whole currency units (NOK in this case)",
          nanos: "10^-9 of one currency unit"
        },
        parserLogic: {
          step1: "Receive raw price object from Google API",
          step2: "Parse units as integer (whole NOK)",
          step3: "Parse nanos as integer (billionths of NOK)",
          step4: "Calculate: units + (nanos / 1,000,000,000)",
          step5: "Store result in FuelPrice.priceNok"
        },
        expectedPrices: "Realistic Norwegian fuel prices (20-25 NOK/L range)",
        whyTheyArent: transformationChain.length === 0 
          ? "No fuel prices returned from Google API" 
          : "Inspect step3_storedInDatabase.priceNok for actual values"
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});