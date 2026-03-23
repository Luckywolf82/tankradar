import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * runGooglePlacesFetchAutomation
 * 
 * Kjøres automatisk på schedule (daglig).
 * - Henter priser fra GooglePlaces
 * - Matcher mot OSM-katalog
 * - Klassifiserer som high_confidence / review_needed / unmatched
 * - Logger statistikk
 * 
 * Regler:
 * ✓ Parser låst (bruker eksisterende parser)
 * ✓ Plausibility kjøres etter parsing
 * ✓ Bare realistic_price i normal presentasjon
 * ✓ review_needed vises separat
 * ✓ Ingen merge-engine
 * ✓ Deduplicering av identiske observasjoner
 */

// Test locations for coverage
const TEST_LOCATIONS = {
  oslo: { latitude: 59.9139, longitude: 10.7522, name: "Oslo sentrum", radiusMeters: 5000 },
  trondheim: { latitude: 63.4305, longitude: 10.3951, name: "Trondheim sentrum", radiusMeters: 5000 },
  bergen: { latitude: 60.3895, longitude: 5.3221, name: "Bergen sentrum", radiusMeters: 5000 },
  stavanger: { latitude: 58.9701, longitude: 5.7331, name: "Stavanger sentrum", radiusMeters: 5000 }
};

function normalizeChain(name) {
  if (!name) return null;
  const normalized = name.toLowerCase().trim()
    .replace(/[-\s]+/g, " ")
    .replace(/\s+/g, " ");
  
  const chainMap = {
    "esso norway": "esso",
    "essono": "esso",
    "essopluss": "esso",
    "circle k": "circle k",
    "circlekiosk": "circle k",
    "circlekiosks": "circle k",
    "circlek": "circle k",
    "uno x": "uno x",
    "uno-x": "uno x",
    "unox": "uno x",
    "unoxpress": "uno x"
  };
  
  return chainMap[normalized] || normalized;
}

function normalizeFuelType(googleType) {
  const mapping = {
    "SP95": "gasoline_95",
    "SP98": "gasoline_98",
    "DIESEL": "diesel"
  };
  return mapping[googleType] || null;
}

function extractPriceNok(priceObj) {
  if (!priceObj || priceObj.currencyCode !== "NOK") return null;
  const units = Number(priceObj.units) || 0;
  const nanos = Number(priceObj.nanos) || 0;
  return units + (nanos / 1e9);
}

function classifyPricePlausibility(priceNok) {
  if (priceNok === null || priceNok === undefined) return null;
  if (priceNok < 10) return "suspect_price_low";
  if (priceNok > 30) return "suspect_price_high";
  return "realistic_price";
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function matchStationToPriceSource(googlePlace, allStations) {
  const googleName = googlePlace.displayName?.text || "";
  const googleLat = googlePlace.location?.latitude;
  const googleLon = googlePlace.location?.longitude;

  if (!googleLat || !googleLon) return null;

  let bestMatch = null;
  let bestDistance = Infinity;

  let inferredChain = null;
  const lowerName = googleName.toLowerCase();
  if (lowerName.includes("circle k")) inferredChain = "circle k";
  else if (lowerName.includes("uno") && lowerName.includes("x")) inferredChain = "uno x";
  else if (lowerName.includes("esso")) inferredChain = "esso";
  else if (lowerName.includes("shell")) inferredChain = "shell";
  else if (lowerName.includes("statoil")) inferredChain = "statoil";
  else if (lowerName.includes("st1")) inferredChain = "st1";

  if (!inferredChain) return null;

  const normalizedGoogleChain = normalizeChain(inferredChain);

  for (const station of allStations) {
    if (!station.latitude || !station.longitude || !station.chain) continue;

    const distanceMeters = haversineDistance(googleLat, googleLon, station.latitude, station.longitude);
    const normalizedStationChain = normalizeChain(station.chain);

    if (normalizedGoogleChain !== normalizedStationChain) continue;
    if (distanceMeters > 500) continue;

    let confidence = 0;
    let nameMatch = googleName.toLowerCase().includes((station.name || "").toLowerCase());
    
    if (distanceMeters < 50) {
      confidence = nameMatch ? 0.90 : 0.85;
    } else if (distanceMeters < 150) {
      confidence = 0.80;
    } else if (distanceMeters < 300) {
      confidence = 0.65;
    } else if (distanceMeters < 500) {
      confidence = 0.55;
    } else {
      continue;
    }

    if (distanceMeters < bestDistance) {
      bestMatch = { station, distanceMeters, confidence };
      bestDistance = distanceMeters;
    }
  }

  return bestMatch;
}

async function fetchGooglePlacesData(apiKey, location) {
  const url = "https://places.googleapis.com/v1/places:searchNearby";
  
  const body = {
    includedTypes: ["gas_station"],
    maxResultCount: 20,
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

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}`, location: location.name };
    }

    const data = await response.json();
    return { success: true, location: location.name, places: data.places || [] };
  } catch (error) {
    return { success: false, error: error.message, location: location.name };
  }
}

Deno.serve(async (req) => {
  const automationStartedAt = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    // Scheduled automations run without a user token — always use service role.
    const db = base44.asServiceRole;

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return Response.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 500 });
    }

    let allStations = await db.entities.Station.list();
    if (allStations.length === 0) {
      const testStations = [
        { name: "Circle K Ferner", chain: "Circle K", latitude: 59.9139, longitude: 10.7522, city: "Oslo" },
        { name: "Uno-X Oslo", chain: "Uno-X", latitude: 59.9084, longitude: 10.7282, city: "Oslo" },
        { name: "ESSO Nationaltheatret", chain: "ESSO", latitude: 59.9126, longitude: 10.7461, city: "Oslo" },
        { name: "Esso Enebakkveien", chain: "Esso", latitude: 59.8946, longitude: 10.8053, city: "Oslo" },
        { name: "Circle K Uelands gate", chain: "Circle K", latitude: 59.9075, longitude: 10.7312, city: "Oslo" },
        { name: "Shell Trondheim", chain: "Shell", latitude: 63.4270, longitude: 10.3889, city: "Trondheim" },
        { name: "Circle K Trondheim Øya", chain: "Circle K", latitude: 63.4156, longitude: 10.4032, city: "Trondheim" },
        { name: "Circle K Tunga", chain: "Circle K", latitude: 63.4209, longitude: 10.4607, city: "Trondheim" },
        { name: "Shell Bergen", chain: "Shell", latitude: 60.3895, longitude: 5.3221, city: "Bergen" },
        { name: "Uno-X Bergen", chain: "Uno-X", latitude: 60.3912, longitude: 5.3156, city: "Bergen" },
        { name: "Circle K Bergen", chain: "Circle K", latitude: 60.3856, longitude: 5.3289, city: "Bergen" },
        { name: "Shell Stavanger", chain: "Shell", latitude: 58.9701, longitude: 5.7331, city: "Stavanger" },
        { name: "Esso Stavanger", chain: "Esso", latitude: 58.9658, longitude: 5.7289, city: "Stavanger" },
        { name: "Circle K Stavanger", chain: "Circle K", latitude: 58.9745, longitude: 5.7371, city: "Stavanger" },
        { name: "Uno-X Stavanger", chain: "Uno-X", latitude: 58.9680, longitude: 5.7425, city: "Stavanger" }
      ];
      allStations = testStations;
    }

    // ── SINGLE UPFRONT DEDUP LOAD ────────────────────────────────────────────
    // Load all existing GooglePlaces FuelPrice rows once. Dedup is done in
    // memory instead of one entity query per observation (avoids 429s).
    const existingGPPrices = await db.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-created_date",
      2000
    );
    // Build a lookup key: stationId|fuelType → most recent { priceNok, sourceUpdatedAt }
    const dedupMap = {};
    for (const row of existingGPPrices) {
      const key = `${row.stationId}|${row.fuelType}`;
      if (!dedupMap[key]) {
        dedupMap[key] = { priceNok: row.priceNok, sourceUpdatedAt: row.sourceUpdatedAt };
      }
    }
    // ── END DEDUP LOAD ───────────────────────────────────────────────────────

    const stats = {
      // API-nivå tracking
      totalGooglePlacesResults: 0,
      stationsWithPriceData: 0,
      stationsWithoutPriceData: 0,
      
      // Matching-nivå tracking
      observationsMatched: 0,
      observationsUnmatched: 0,
      
      // Klassifisering-nivå tracking
      highConfidenceObservations: 0,
      reviewNeededObservations: 0,
      
      // Plausibilitet-nivå tracking
      observationsByPlausibility: {
        realistic_price: 0,
        suspect_price_low: 0,
        suspect_price_high: 0
      },
      
      // Persistence-nivå tracking
      fuelPricesCreated: 0,
      fuelPricesDeduplicated: 0,
      fuelPricesSkipped: 0
    };

    // Hent fra alle test-lokasjoner
    for (const [locationKey, location] of Object.entries(TEST_LOCATIONS)) {
      const googleResult = await fetchGooglePlacesData(apiKey, location);

      if (!googleResult.success) {
        continue;
      }

      // Prosesser hver GooglePlace
      for (const googlePlace of googleResult.places) {
        stats.totalGooglePlacesResults++;
        
        const fuelOptions = googlePlace.fuelOptions?.fuelPrices || [];

        if (fuelOptions.length === 0) {
          stats.stationsWithoutPriceData++;
          continue;
        }

        stats.stationsWithPriceData++;

        const matchResult = matchStationToPriceSource(googlePlace, allStations);

        if (!matchResult) {
          stats.observationsUnmatched++;
          continue;
        }

        stats.observationsMatched++;
        const station = matchResult.station;

        // Klassifiser som high_confidence eller review_needed
        const isReviewNeeded = matchResult.distanceMeters > 200 || matchResult.confidence < 0.70;
        if (isReviewNeeded) {
          stats.reviewNeededObservations++;
        } else {
          stats.highConfidenceObservations++;
        }

        // Opprett FuelPrice for hver drivstofftype
        for (const fuelPrice of fuelOptions) {
          const fuelType = normalizeFuelType(fuelPrice.type);
          if (!fuelType) {
            stats.fuelPricesSkipped++;
            continue;
          }

          const priceNok = extractPriceNok(fuelPrice.price);
          if (!priceNok) {
            stats.fuelPricesSkipped++;
            continue;
          }

          const plausibilityStatus = classifyPricePlausibility(priceNok);
          stats.observationsByPlausibility[plausibilityStatus]++;

          const sourceUpdatedAt = fuelPrice.updateTime || null;
          const fetchedAtNow = new Date().toISOString();

          // Deduplicering: in-memory check (no per-observation entity query)
          const dedupKey = `${station.id}|${fuelType}`;
          const existing = dedupMap[dedupKey];
          if (existing && existing.priceNok === priceNok && existing.sourceUpdatedAt === sourceUpdatedAt) {
            stats.fuelPricesDeduplicated++;
            continue;
          }

          // Collect for batch creation
          newPriceRecords.push({
            stationId: station.id,
            fuelType: fuelType,
            priceNok: priceNok,
            priceType: "station_level",
            sourceName: "GooglePlaces",
            sourceUrl: null,
            sourceUpdatedAt: sourceUpdatedAt,
            fetchedAt: fetchedAtNow,
            sourceFrequency: "near_realtime",
            confidenceScore: matchResult.confidence,
            parserVersion: "gp_v1",
            plausibilityStatus: plausibilityStatus,
            rawPayloadSnippet: `${fuelPrice.type} | ${Math.round(priceNok * 100) / 100} NOK/L`
          });
        }
      }
    }

    // Logg automation completion
    await base44.asServiceRole.entities.FetchLog.create({
      sourceName: "GooglePlaces",
      startedAt: automationStartedAt,
      finishedAt: new Date().toISOString(),
      success: true,
      httpStatus: 200,
      stationsFound: stats.totalGooglePlacesResults,
      pricesFound: stats.stationsWithPriceData,
      recordsCreated: stats.fuelPricesCreated,
      recordsSkipped: stats.fuelPricesDeduplicated + stats.fuelPricesSkipped,
      parserVersion: "gp_v1",
      notes: `API=${stats.totalGooglePlacesResults} with_prices=${stats.stationsWithPriceData} matched=${stats.observationsMatched} high=${stats.highConfidenceObservations} review=${stats.reviewNeededObservations} created=${stats.fuelPricesCreated} dedup=${stats.fuelPricesDeduplicated}`
    });

    return Response.json({
      success: true,
      automation: {
        executedAt: automationStartedAt,
        completedAt: new Date().toISOString()
      },
      dataflow: {
        "1_google_places_api_results": stats.totalGooglePlacesResults,
        "2_stations_with_price_data": stats.stationsWithPriceData,
        "2_stations_without_price_data": stats.stationsWithoutPriceData,
        "3_matched_to_osm": stats.observationsMatched,
        "3_unmatched_to_osm": stats.observationsUnmatched
      },
      classification: {
        "high_confidence_observations": stats.highConfidenceObservations,
        "review_needed_observations": stats.reviewNeededObservations
      },
      plausibility: {
        "realistic_price": stats.observationsByPlausibility.realistic_price,
        "suspect_price_low": stats.observationsByPlausibility.suspect_price_low,
        "suspect_price_high": stats.observationsByPlausibility.suspect_price_high
      },
      persistence: {
        "new_fuel_price_records_created": stats.fuelPricesCreated,
        "deduplicated_identical_observations": stats.fuelPricesDeduplicated,
        "skipped_parse_errors": stats.fuelPricesSkipped
      },
      summary: {
        total_observations_processed: stats.highConfidenceObservations + stats.reviewNeededObservations + stats.observationsUnmatched,
        usable_observations: stats.highConfidenceObservations + stats.reviewNeededObservations,
        dashboard_impact: `${stats.highConfidenceObservations} high_confidence (normal) + ${stats.reviewNeededObservations} review_needed (warned)`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});