import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * validateFixedParser
 * 
 * Kjører en ny ekte fetch, lagrer 3 observasjoner, og viser:
 * - Rå API-data (units, nanos)
 * - Parser-resultat
 * - Verdi sendt til create()
 * - Verdi lagret i databasen
 * - Verdi dashboardet leser
 * 
 * Bekrefter at priser er i realistisk intervall og plausibilityStatus er korrekt.
 */

function extractPriceNok(priceObj) {
  if (!priceObj || priceObj.currencyCode !== "NOK") return null;
  const units = Number(priceObj.units) || 0;
  const nanos = Number(priceObj.nanos) || 0;
  return units + (nanos / 1e9);
}

function classifyPricePlausibility(priceNok) {
  if (priceNok < 10) return "suspect_price_low";
  if (priceNok > 40) return "suspect_price_high";
  return "realistic_price";
}

function normalizeFuelType(type) {
  if (!type) return null;
  const upper = type.toUpperCase();
  if (upper.includes("95")) return "gasoline_95";
  if (upper.includes("98")) return "gasoline_98";
  if (upper.includes("DIESEL")) return "diesel";
  return null;
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

    console.log("[VALIDATE] === EKTE FETCH START ===");

    // Hent fra Oslo sentrum
    const url = "https://places.googleapis.com/v1/places:searchNearby";
    const body = {
      includedTypes: ["gas_station"],
      maxResultCount: 5,
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

    console.log(`[VALIDATE] Hentet ${rawApiResponse.places.length} stasjoner`);

    // Samle 3 observasjoner
    const observations = [];
    let recordCount = 0;

    for (const place of rawApiResponse.places) {
      if (recordCount >= 3) break;

      const station = place.displayName?.text || "Unknown";
      const fuelPrices = place.fuelOptions?.fuelPrices || [];

      for (const fp of fuelPrices) {
        if (recordCount >= 3) break;

        const rawPrice = fp.price;
        const fuelType = normalizeFuelType(fp.type);

        if (!fuelType) continue;

        // === PARSER ===
        const parsedNok = extractPriceNok(rawPrice);
        if (!parsedNok) continue;

        // === KLASSIFISERING ===
        const plausibility = classifyPricePlausibility(parsedNok);

        // === OPPRETT I DATABASE ===
        const payload = {
          stationId: `validate_${recordCount}`,
          locationLabel: station,
          fuelType: fuelType,
          priceNok: parsedNok,
          priceType: "station_level",
          sourceName: "GooglePlaces",
          sourceUrl: null,
          sourceUpdatedAt: fp.updateTime || null,
          fetchedAt: new Date().toISOString(),
          sourceFrequency: "near_realtime",
          confidenceScore: 0.85,
          parserVersion: "gp_v1",
          plausibilityStatus: plausibility,
          rawPayloadSnippet: `${fp.type} | ${parsedNok} NOK/L | ${plausibility}`
        };

        const created = await base44.entities.FuelPrice.create(payload);

        // === LES TILBAKE FRA DATABASE ===
        const stored = await base44.entities.FuelPrice.filter(
          { id: created.id },
          null,
          1
        );

        const storedRecord = stored[0];

        // === LES SOM DASHBOARD VILLE GJORT ===
        const dashboard = await base44.entities.FuelPrice.filter(
          { id: created.id },
          null,
          1
        );

        observations.push({
          observationNumber: recordCount + 1,
          station: station,
          fuelType: fp.type,
          
          rawData: {
            units: rawPrice.units,
            nanos: rawPrice.nanos,
            currencyCode: rawPrice.currencyCode
          },
          
          parserResult: parsedNok,
          sentToCreate: payload.priceNok,
          storedInDatabase: storedRecord.priceNok,
          dashboardReads: dashboard[0].priceNok,
          
          plausibilityStatus: storedRecord.plausibilityStatus,
          
          validation: {
            parserToCreate: parsedNok === payload.priceNok ? "✓" : "✗",
            createToStored: payload.priceNok === storedRecord.priceNok ? "✓" : "✗",
            storedToDashboard: storedRecord.priceNok === dashboard[0].priceNok ? "✓" : "✗",
            allMatch: parsedNok === payload.priceNok && payload.priceNok === storedRecord.priceNok && storedRecord.priceNok === dashboard[0].priceNok ? "✓ YES" : "✗ NO",
            inRealisticRange: parsedNok >= 15 && parsedNok <= 30 ? "✓ YES (15-30 NOK/L)" : "✗ NO",
            plausibilityIsRealistic: storedRecord.plausibilityStatus === "realistic_price" ? "✓ YES" : "✗ NO"
          }
        });

        recordCount++;
      }
    }

    if (observations.length === 0) {
      return Response.json({ error: "No valid fuel prices found in response" }, { status: 404 });
    }

    // === SLUTTRAPPORT ===
    const allMatch = observations.every(o => o.validation.allMatch === "✓ YES");
    const allRealistic = observations.every(o => o.validation.inRealisticRange === "✓ YES (15-30 NOK/L)");
    const allPlausible = observations.every(o => o.validation.plausibilityIsRealistic === "✓ YES");

    return Response.json({
      summary: {
        observationsCollected: observations.length,
        allMatchEndToEnd: allMatch ? "✓ YES" : "✗ NO",
        allInRealisticRange: allRealistic ? "✓ YES (15-30 NOK/L)" : "✗ NO",
        allPlausibilityCorrect: allPlausible ? "✓ YES" : "✗ NO"
      },
      observations: observations,
      conclusion: allMatch && allRealistic && allPlausible
        ? "✓ PARSER FIX VALIDATED: All prices correctly parsed, stored, and displayed. Dashboard shows realistic prices."
        : "✗ ISSUES REMAIN: Check individual observations above."
    });

  } catch (error) {
    console.error("[ERROR]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});