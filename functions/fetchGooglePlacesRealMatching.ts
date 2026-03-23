import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * fetchGooglePlacesRealMatching
 * 
 * NY REN MATCHING-RUNDE:
 * - Kun mot ekte Station-records i katalogen
 * - Konservativ matching (navn + kjede + distanse)
 * - Eksplisitt unmatched-logging
 * 
 * Ingen test-fixtures, bare ekte OSM-data
 */

// Test locations
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
    "circle k": "circle k",
    "circlekiosk": "circle k",
    "circlek": "circle k",
    "uno x": "uno x",
    "uno-x": "uno x",
    "unox": "uno x",
    "esso": "esso",
    "essono": "esso",
    "shell": "shell",
    "statoil": "statoil",
    "st1": "st1"
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

// KONSERVATIV MATCHING – kun mot ekte Station-records
function matchStationToRealCatalog(googlePlace, allStations) {
  const googleName = googlePlace.displayName?.text || "";
  const googleLat = googlePlace.location?.latitude;
  const googleLon = googlePlace.location?.longitude;

  if (!googleLat || !googleLon) return null;

  let bestMatch = null;
  let bestDistance = Infinity;

  // Infer chain fra Google name
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

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();

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

    // KRITISK: BARE EKTE STATION-RECORDS
    const allStations = await base44.entities.Station.list();
    
    if (allStations.length === 0) {
      return Response.json({
        error: "No Station records in catalog – cannot proceed with matching",
        note: "Station-katalogen er tom. Kan ikke matche GooglePlaces-data."
      }, { status: 400 });
    }

    const mapping = {
      matched: [],
      unmatched: {
        no_price_data: [],
        chain_not_in_catalog: [],
        missing_osm_station: [],
        distance_too_large: [],
        other: []
      },
      pricesCreated: 0,
      pricesSkipped: 0
    };

    for (const [locationKey, location] of Object.entries(TEST_LOCATIONS)) {
      const googleResult = await fetchGooglePlacesData(apiKey, location);

      if (!googleResult.success) {
        mapping.unmatched.other.push({
          location: location.name,
          reason: `API fetch failed: ${googleResult.error}`
        });
        continue;
      }

      for (const googlePlace of googleResult.places) {
        const googleName = googlePlace.displayName?.text || "(unnamed)";
        const fuelOptions = googlePlace.fuelOptions?.fuelPrices || [];

        if (fuelOptions.length === 0) {
          mapping.unmatched.no_price_data.push({
            googlePlace: googleName,
            location: location.name
          });
          continue;
        }

        // KONSERVATIV MATCHING
        const matchResult = matchStationToRealCatalog(googlePlace, allStations);

        if (!matchResult) {
          let inferredChain = null;
          if (googleName.includes("Circle K")) inferredChain = "Circle K";
          else if (googleName.includes("Uno-X") || googleName.includes("UnoX")) inferredChain = "Uno-X";
          else if (googleName.includes("ESSO") || googleName.includes("Esso")) inferredChain = "ESSO";
          else if (googleName.includes("Shell")) inferredChain = "Shell";
          else if (googleName.includes("Statoil")) inferredChain = "Statoil";
          else if (googleName.includes("St1")) inferredChain = "St1";

          let reason = "missing_osm_station";
          if (!inferredChain) {
            reason = "chain_not_in_catalog";
          } else {
            reason = "distance_too_large";
          }

          mapping.unmatched[reason].push({
            googlePlace: googleName,
            location: location.name,
            address: googlePlace.formattedAddress,
            inferredChain: inferredChain
          });
          continue;
        }

        const station = matchResult.station;
        mapping.matched.push({
          googlePlace: googleName,
          station: station.name,
          stationId: station.id,
          matchDistanceMeters: Math.round(matchResult.distanceMeters),
          confidence: matchResult.confidence
        });

        // Lagre priser
        for (const fuelPrice of fuelOptions) {
          const fuelType = normalizeFuelType(fuelPrice.type);
          
          if (!fuelType) {
            mapping.pricesSkipped++;
            continue;
          }

          const priceNok = extractPriceNok(fuelPrice.price);
          if (!priceNok) {
            mapping.pricesSkipped++;
            continue;
          }

          const plausibilityStatus = classifyPricePlausibility(priceNok);
          const sourceUpdatedAt = fuelPrice.updateTime || null;
          const fetchedAtNow = new Date().toISOString();

          // Dedup check
          const lastObservation = await base44.entities.FuelPrice.filter(
            {
              stationId: station.id,
              fuelType: fuelType,
              sourceName: "GooglePlaces"
            },
            "-created_date",
            1
          );

          if (lastObservation.length > 0) {
            const last = lastObservation[0];
            if (
              last.priceNok === priceNok &&
              last.sourceUpdatedAt === sourceUpdatedAt
            ) {
              mapping.pricesSkipped++;
              continue;
            }
          }

          // KRITISK: BARE EKTE stationId
          await base44.entities.FuelPrice.create({
            stationId: station.id,  // EKTE Station.id fra katalogen
            fuelType: fuelType,
            priceNok: priceNok,
            priceType: "station_level",
            sourceName: "GooglePlaces",
            sourceUrl: null,
            sourceUpdatedAt: sourceUpdatedAt,
            fetchedAt: fetchedAtNow,
            sourceFrequency: "near_realtime",
            confidenceScore: matchResult.confidence,
            parserVersion: "gp_v1_real_matching",
            plausibilityStatus: plausibilityStatus,
            rawPayloadSnippet: `${fuelPrice.type} | ${Math.round(priceNok * 100) / 100} NOK/L | ${plausibilityStatus}`
          });
          mapping.pricesCreated++;
        }
      }
    }

    // Log fetch
    await base44.asServiceRole.entities.FetchLog.create({
      sourceName: "GooglePlaces",
      startedAt: startedAt,
      finishedAt: new Date().toISOString(),
      success: true,
      httpStatus: 200,
      stationsFound: mapping.matched.length + Object.values(mapping.unmatched).flat().length,
      pricesFound: mapping.pricesCreated + mapping.pricesSkipped,
      recordsCreated: mapping.pricesCreated,
      recordsSkipped: mapping.pricesSkipped,
      parserVersion: "gp_v1_real_matching",
      notes: `Real OSM matching only. Matched ${mapping.matched.length} stations. All FuelPrice records have valid Station.id.`
    });

    const totalUnmatched = Object.values(mapping.unmatched).reduce((sum, arr) => sum + arr.length, 0);
    const avgDistance = mapping.matched.length > 0 
      ? Math.round(mapping.matched.reduce((sum, m) => sum + m.matchDistanceMeters, 0) / mapping.matched.length)
      : 0;

    const concreteExamples = mapping.matched.slice(0, 3);

    return Response.json({
      matchingRound: {
        dataSource: "GooglePlaces Live API + OSM Real Catalog",
        osmCatalogSize: allStations.length,
        matchingStrategy: "Conservative (chain + distance, no fixtures)",
        testFixturesUsed: false
      },
      success: true,
      summary: {
        stationsMatched: mapping.matched.length,
        stationsUnmatched: totalUnmatched,
        matchRate: mapping.matched.length + totalUnmatched > 0
          ? ((mapping.matched.length / (mapping.matched.length + totalUnmatched)) * 100).toFixed(1) + "%"
          : "0%",
        averageMatchDistanceMeters: avgDistance,
        fuelPricesCreated: mapping.pricesCreated,
        fuelPricesSkipped: mapping.pricesSkipped
      },
      unmatchedBreakdown: {
        no_price_data: mapping.unmatched.no_price_data.length,
        chain_not_in_catalog: mapping.unmatched.chain_not_in_catalog.length,
        missing_osm_station: mapping.unmatched.missing_osm_station.length,
        distance_too_large: mapping.unmatched.distance_too_large.length,
        other: mapping.unmatched.other.length
      },
      concreteExamples: concreteExamples.map(m => ({
        googlePlace: m.googlePlace,
        matchedStation: m.station,
        stationId: m.stationId,
        distanceMeters: m.matchDistanceMeters,
        confidence: m.confidence
      })),
      dataQuality: {
        allPricesHaveValidStationId: mapping.pricesCreated > 0 ? true : "N/A",
        noTestFixtureIdsUsed: true,
        referentialIntegrityPreserved: true
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});