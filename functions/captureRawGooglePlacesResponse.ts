import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * captureRawGooglePlacesResponse
 * 
 * Gjør ett live Google Places API-kall.
 * Logg hele rå JSON-responsen for én stasjon.
 * Vis eksakt disse feltene UTEN parsing:
 * - displayName
 * - fuelOptions.fuelPrices[].type
 * - fuelOptions.fuelPrices[].price.currencyCode
 * - fuelOptions.fuelPrices[].price.units
 * - fuelOptions.fuelPrices[].price.nanos
 */

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

    // Gjør ett live API-kall til Oslo sentrum
    const url = "https://places.googleapis.com/v1/places:searchNearby";
    const location = { latitude: 59.9139, longitude: 10.7522, name: "Oslo sentrum", radiusMeters: 5000 };
    
    const body = {
      includedTypes: ["gas_station"],
      maxResultCount: 1,  // Bare 1 stasjon
      locationRestriction: {
        circle: {
          center: { latitude: location.latitude, longitude: location.longitude },
          radius: location.radiusMeters
        }
      }
    };

    const headers = {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.fuelOptions"
    };

    console.log("[CAPTURE] Sending Google Places API request...");
    console.log("[CAPTURE] Location:", location.name);
    console.log("[CAPTURE] Request body:", JSON.stringify(body, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return Response.json({
        error: `HTTP ${response.status}`,
        message: `Google Places API returned status ${response.status}`,
        location: location.name
      }, { status: 500 });
    }

    const rawApiResponse = await response.json();
    
    console.log("[CAPTURE] Raw API response received");
    console.log("[CAPTURE] Response:", JSON.stringify(rawApiResponse, null, 2));

    // Hvis ingen steder returnert
    if (!rawApiResponse.places || rawApiResponse.places.length === 0) {
      return Response.json({
        error: "No gas stations found in response",
        rawResponse: rawApiResponse,
        location: location.name
      }, { status: 404 });
    }

    // Ekstrahuer første stasjon fra rå respons (INGEN PARSING ELLER BEREGNING)
    const firstPlace = rawApiResponse.places[0];

    // Vis EKSAKT disse feltene fra rå JSON
    const extractedFields = {
      displayName: firstPlace.displayName?.text || null,
      fuelOptions: {
        fuelPrices: (firstPlace.fuelOptions?.fuelPrices || []).map((fp) => ({
          type: fp.type || null,
          price: {
            currencyCode: fp.price?.currencyCode || null,
            units: fp.price?.units || null,
            nanos: fp.price?.nanos || null
          }
        }))
      }
    };

    return Response.json({
      captureStatus: "SUCCESS",
      apiCall: {
        timestamp: new Date().toISOString(),
        location: location.name,
        endpoint: url,
        fieldMask: "places.id,places.displayName,places.formattedAddress,places.location,places.fuelOptions"
      },
      rawApiResponse: rawApiResponse,
      extractedFields: extractedFields,
      notes: "NO PARSING, NO CALCULATIONS. These are the exact values from the Google Places API response."
    });

  } catch (error) {
    console.error("[CAPTURE] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});