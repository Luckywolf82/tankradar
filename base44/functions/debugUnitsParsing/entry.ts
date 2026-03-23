import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * debugUnitsParsing
 * 
 * Gjør ett live API-kall og logg EKSAKT hvordan units blir håndtert i parser.
 * Vis type og verdi ved hver steg.
 */

function extractPriceNok_WithDebug(priceObj, debugLabel) {
  console.log(`[DEBUG] ${debugLabel}:`);
  console.log(`  - currencyCode: ${priceObj.currencyCode}, type: ${typeof priceObj.currencyCode}`);
  console.log(`  - units (raw): ${priceObj.units}, type: ${typeof priceObj.units}`);
  console.log(`  - nanos (raw): ${priceObj.nanos}, type: ${typeof priceObj.nanos}`);
  
  if (!priceObj || priceObj.currencyCode !== "NOK") {
    console.log(`  - REJECTED: currencyCode !== NOK`);
    return null;
  }
  
  const units = priceObj.units || 0;
  const nanos = priceObj.nanos || 0;
  
  console.log(`  - units (after ||): ${units}, type: ${typeof units}`);
  console.log(`  - nanos (after ||): ${nanos}, type: ${typeof nanos}`);
  
  const unitsNum = Number(units);
  const nanosNum = Number(nanos);
  
  console.log(`  - units (Number()): ${unitsNum}, type: ${typeof unitsNum}`);
  console.log(`  - nanos (Number()): ${nanosNum}, type: ${typeof nanosNum}`);
  
  const nanosContribution = nanosNum / 1e9;
  console.log(`  - nanos / 1e9 = ${nanosContribution}`);
  
  const result = unitsNum + nanosContribution;
  console.log(`  - RESULT: ${unitsNum} + ${nanosContribution} = ${result}`);
  
  return result;
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
    const location = { latitude: 59.9139, longitude: 10.7522, name: "Oslo sentrum", radiusMeters: 5000 };
    
    const body = {
      includedTypes: ["gas_station"],
      maxResultCount: 1,
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

    console.log("[DEBUG] Calling Google Places API...");
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return Response.json({ error: `HTTP ${response.status}` }, { status: 500 });
    }

    const rawApiResponse = await response.json();

    if (!rawApiResponse.places || rawApiResponse.places.length === 0) {
      return Response.json({ error: "No gas stations found" }, { status: 404 });
    }

    const firstPlace = rawApiResponse.places[0];
    const fuelPrices = firstPlace.fuelOptions?.fuelPrices || [];

    const debugResults = [];

    for (const [idx, fp] of fuelPrices.entries()) {
      const label = `Place[0].fuelPrice[${idx}] (${fp.type})`;
      const result = extractPriceNok_WithDebug(fp.price, label);
      
      debugResults.push({
        type: fp.type,
        rawPrice: fp.price,
        parsedPriceNok: result
      });
    }

    return Response.json({
      apiCallStatus: "SUCCESS",
      location: location.name,
      station: firstPlace.displayName?.text,
      debugResults: debugResults,
      note: "Se logs for detaljert debug-output for hver fuel type"
    });

  } catch (error) {
    console.error("[ERROR]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
