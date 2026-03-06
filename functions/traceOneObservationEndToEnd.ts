import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * traceOneObservationEndToEnd
 * 
 * Sporer ÉN konkret prisobservasjon gjennom alle lag:
 * 1. Rå Google API price
 * 2. Parser-resultat (extractPriceNok)
 * 3. Verdi sendt til FuelPrice.create()
 * 4. Verdi lagret i databasen
 * 5. Verdi dashboardet leser
 */

// PARSER - LÅST
function extractPriceNok(priceObj) {
  if (!priceObj || priceObj.currencyCode !== "NOK") return null;
  const units = priceObj.units || 0;
  const nanos = priceObj.nanos || 0;
  return units + (nanos / 1e9);
}

function classifyPricePlausibility(priceNok) {
  if (priceNok < 10) return "suspect_price_low";
  if (priceNok > 40) return "suspect_price_high";
  return "realistic_price";
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

    // === STEG 1: Hent rå Google API price ===
    console.log("[TRACE] === STEG 1: RÅ GOOGLE API ===");
    
    const url = "https://places.googleapis.com/v1/places:searchNearby";
    const body = {
      includedTypes: ["gas_station"],
      maxResultCount: 1,
      locationRestriction: {
        circle: {
          center: { latitude: 59.9139, longitude: 10.7522 },
          radius: 5000
        }
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.fuelOptions"
      },
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
    const station = firstPlace.displayName?.text || "Unknown";
    const fuelPrices = firstPlace.fuelOptions?.fuelPrices || [];

    if (fuelPrices.length === 0) {
      return Response.json({ error: "No fuel prices in response" }, { status: 404 });
    }

    // Bruk første fuel type
    const firstFuelPrice = fuelPrices[0];
    const rawPrice = firstFuelPrice.price;

    console.log("[TRACE] Station:", station);
    console.log("[TRACE] Raw price object:", JSON.stringify(rawPrice));

    // === STEG 2: Parser-resultat ===
    console.log("[TRACE] === STEG 2: PARSER-RESULTAT ===");
    
    const parsedPriceNok = extractPriceNok(rawPrice);
    console.log("[TRACE] Parsed priceNok:", parsedPriceNok);

    // === STEG 3: Verdi sendt til FuelPrice.create() ===
    console.log("[TRACE] === STEG 3: VERDI SENDT TIL FuelPrice.create() ===");
    
    const fuelType = firstFuelPrice.type;
    const plausibilityStatus = classifyPricePlausibility(parsedPriceNok);
    const sourceUpdatedAt = firstFuelPrice.updateTime || null;
    const fetchedAtNow = new Date().toISOString();

    const fuelPricePayload = {
      stationId: "test_station_trace",
      locationLabel: station,
      fuelType: fuelType,
      priceNok: parsedPriceNok,
      priceType: "station_level",
      sourceName: "GooglePlaces",
      sourceUrl: null,
      sourceUpdatedAt: sourceUpdatedAt,
      fetchedAt: fetchedAtNow,
      sourceFrequency: "near_realtime",
      confidenceScore: 0.8,
      parserVersion: "gp_v1",
      plausibilityStatus: plausibilityStatus,
      rawPayloadSnippet: `${fuelType} | ${parsedPriceNok} NOK/L | ${plausibilityStatus}`
    };

    console.log("[TRACE] Payload.priceNok sendt til FuelPrice.create():", fuelPricePayload.priceNok);
    console.log("[TRACE] Full payload:", JSON.stringify(fuelPricePayload, null, 2));

    // === STEG 4: Opprett og les fra databasen ===
    console.log("[TRACE] === STEG 4: LAGRING OG LESING FRA DATABASE ===");
    
    const created = await base44.entities.FuelPrice.create(fuelPricePayload);
    const recordId = created.id;

    console.log("[TRACE] Created record ID:", recordId);

    // Hent samme post tilbake
    const stored = await base44.entities.FuelPrice.filter(
      { id: recordId },
      null,
      1
    );

    if (stored.length === 0) {
      return Response.json({ error: "Could not retrieve stored record" }, { status: 500 });
    }

    const storedRecord = stored[0];
    console.log("[TRACE] Stored record priceNok:", storedRecord.priceNok);
    console.log("[TRACE] Full stored record:", JSON.stringify(storedRecord, null, 2));

    // === STEG 5: Hva dashboardet leser ===
    console.log("[TRACE] === STEG 5: DASHBOARDLESING ===");
    
    const dashboardData = await base44.entities.FuelPrice.filter(
      { id: recordId },
      null,
      1
    );

    const dashboardRecord = dashboardData[0];
    console.log("[TRACE] Dashboard reads priceNok:", dashboardRecord.priceNok);

    // === SAMMENLIGNING ===
    const trace = {
      step1_rawGooglePrice: rawPrice,
      step2_parserResult: parsedPriceNok,
      step3_sentToCreate: fuelPricePayload.priceNok,
      step4_storedInDatabase: storedRecord.priceNok,
      step5_dashboardReads: dashboardRecord.priceNok,
      
      comparison: {
        parser_vs_create: {
          parser: parsedPriceNok,
          create: fuelPricePayload.priceNok,
          match: parsedPriceNok === fuelPricePayload.priceNok ? "✓ YES" : "✗ NO"
        },
        create_vs_stored: {
          create: fuelPricePayload.priceNok,
          stored: storedRecord.priceNok,
          match: fuelPricePayload.priceNok === storedRecord.priceNok ? "✓ YES" : "✗ NO",
          ratio: storedRecord.priceNok / fuelPricePayload.priceNok
        },
        stored_vs_dashboard: {
          stored: storedRecord.priceNok,
          dashboard: dashboardRecord.priceNok,
          match: storedRecord.priceNok === dashboardRecord.priceNok ? "✓ YES" : "✗ NO"
        }
      },
      
      diagnosis: {
        parserCorrect: parsedPriceNok !== null && parsedPriceNok > 10 && parsedPriceNok < 40,
        parserToCreateMatch: parsedPriceNok === fuelPricePayload.priceNok,
        createToStorageMatch: fuelPricePayload.priceNok === storedRecord.priceNok,
        storageToViewMatch: storedRecord.priceNok === dashboardRecord.priceNok
      }
    };

    return Response.json(trace);

  } catch (error) {
    console.error("[ERROR]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});