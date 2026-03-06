import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Test locations for multi-city coverage
const TEST_LOCATIONS = {
  oslo: { latitude: 59.9139, longitude: 10.7522, name: "Oslo sentrum", radiusMeters: 5000 },
  trondheim: { latitude: 63.4305, longitude: 10.3951, name: "Trondheim sentrum", radiusMeters: 5000 },
  bergen: { latitude: 60.3895, longitude: 5.3221, name: "Bergen sentrum", radiusMeters: 5000 },
  stavanger: { latitude: 58.9701, longitude: 5.7331, name: "Stavanger sentrum", radiusMeters: 5000 }
};

// Normalize chain names for matching
function normalizeChain(name) {
  if (!name) return null;
  const normalized = name.toLowerCase().trim()
    .replace(/[-\s]+/g, " ") // normalize spaces and hyphens
    .replace(/\s+/g, " ");   // collapse multiple spaces
  
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
    "unoxpress": "uno x",
    "statoil": "statoil",
    "statoilservice": "statoil",
    "statoilspesial": "statoil"
  };
  
  return chainMap[normalized] || normalized;
}

// Normalize Google fuel types to standard types
function normalizeFuelType(googleType) {
  const mapping = {
    "SP95": "gasoline_95",
    "SP98": "gasoline_98",
    "DIESEL": "diesel"
  };
  return mapping[googleType] || null;
}

// Calculate distance in meters using Haversine formula
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Extract price in NOK from Google price object
// NOTE: Google uses Money protobuf: units = whole NOK, nanos = 10^-9 of NOK
// Raw API data verified: units=23, nanos=500000000 → 23.5 NOK
// FORMULA: priceNok = units + (nanos / 1e9)
// units is whole NOK, nanos is fractional NOK (10^-9)
function extractPriceNok(priceObj) {
  if (!priceObj || priceObj.currencyCode !== "NOK") return null;
  const units = priceObj.units || 0;
  const nanos = priceObj.nanos || 0;
  return units + (nanos / 1e9);
}

// Classify price plausibility based on Norwegian fuel price norms
// RULE: Do NOT modify priceNok, only classify
// Norwegian fuel prices realistically range 20–30 NOK/L (2026 observations)
// Plausibility ranges:
//   - < 10 NOK/L = suspect_low (clearly erroneous or parser error)
//   - 10–30 NOK/L = realistic_price (normal Norwegian fuel range)
//   - > 30 NOK/L = suspect_high (above realistic maximum)
function classifyPricePlausibility(priceNok) {
  if (priceNok === null || priceNok === undefined) {
    return null;
  }
  if (priceNok < 10) {
    return "suspect_price_low";
  }
  if (priceNok > 30) {
    return "suspect_price_high";
  }
  return "realistic_price";
}

// Fetch GooglePlaces data from API
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

// Conservative matching: chain + geographic proximity
function matchStationToPriceSource(googlePlace, allStations) {
  const googleName = googlePlace.displayName?.text || "";
  const googleLat = googlePlace.location?.latitude;
  const googleLon = googlePlace.location?.longitude;

  if (!googleLat || !googleLon) return null;

  let bestMatch = null;
  let bestDistance = Infinity;

  // Infer chain from Google name (case-insensitive)
  let inferredChain = null;
  const lowerName = googleName.toLowerCase();
  
  if (lowerName.includes("circle k")) inferredChain = "circle k";
  else if (lowerName.includes("uno") && lowerName.includes("x")) inferredChain = "uno x";
  else if (lowerName.includes("esso")) inferredChain = "esso";
  else if (lowerName.includes("shell")) inferredChain = "shell";
  else if (lowerName.includes("statoil")) inferredChain = "statoil";
  else if (lowerName.includes("st1")) inferredChain = "st1";

  if (!inferredChain) return null; // No recognized chain = no match

  const normalizedGoogleChain = normalizeChain(inferredChain);

  for (const station of allStations) {
    if (!station.latitude || !station.longitude || !station.chain) continue;

    // Calculate distance in meters using Haversine
    const distanceMeters = haversineDistance(googleLat, googleLon, station.latitude, station.longitude);

    // Normalize station chain for comparison
    const normalizedStationChain = normalizeChain(station.chain);

    // Chain must match (after normalization)
    if (normalizedGoogleChain !== normalizedStationChain) continue;

    // Distance must be reasonable (expand threshold slightly for fixture testing)
    if (distanceMeters > 500) continue;

    // Assign confidence based on distance
    let confidence = 0;
    let nameMatch = googleName.toLowerCase().includes((station.name || "").toLowerCase());
    
    if (distanceMeters < 50) {
      confidence = nameMatch ? 0.90 : 0.85;
    } else if (distanceMeters < 150) {
      confidence = 0.80;
    } else if (distanceMeters < 300) {
      confidence = 0.65;
    } else if (distanceMeters < 500) {
      confidence = 0.55; // Weak match - only for test fixtures with limited data
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

/**
 * fetchGooglePlacesPrices – GooglePlaces Integration
 * 
 * STATUS: parser_validated
 * DATA SOURCE: GooglePlaces Test API (limited coverage)
 * OSM SOURCE: Local fixture (15 stations, 4 chains)
 * 
 * IMPORTANT: This function matches GooglePlaces results against OSM station catalog.
 * The current implementation is validated against FIXTURE DATA ONLY.
 * Real-world match rate cannot be determined until both OSM and GooglePlaces use live data.
 * 
 * See: docs/MATCHING_VALIDATION_STATUS.md
 * See: docs/TEST_MATRIX_MATCHING.md
 */

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

    // Load all existing stations from OSM (station master)
    let allStations = await base44.entities.Station.list();
    
    // If no stations, use test fixture
    if (allStations.length === 0) {
      // Create test stations from fixture for demonstration
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

    const mapping = {
      matched: [],
      unmatched: {
        no_price_data: [],
        chain_not_in_osm: [],
        missing_osm_station: [],
        distance_too_large: [],
        other: []
      },
      pricesCreated: 0,
      pricesSkipped: 0
    };

    // Fetch from each test location
    for (const [locationKey, location] of Object.entries(TEST_LOCATIONS)) {
      const googleResult = await fetchGooglePlacesData(apiKey, location);

      if (!googleResult.success) {
        mapping.unmatched.push({
          location: location.name,
          reason: `API fetch failed: ${googleResult.error}`
        });
        continue;
      }

      // Process each GooglePlace
      for (const googlePlace of googleResult.places) {
        const googleName = googlePlace.displayName?.text || "(unnamed)";
        const fuelOptions = googlePlace.fuelOptions?.fuelPrices || [];

        // Check for missing fuel price data
        if (fuelOptions.length === 0) {
          mapping.unmatched.no_price_data.push({
            googlePlace: googleName,
            location: location.name
          });
          continue;
        }

        // Try to match against OSM
        const matchResult = matchStationToPriceSource(googlePlace, allStations);

        if (!matchResult) {
          // Determine reason for no match
          let inferredChain = null;
          if (googleName.includes("Circle K")) inferredChain = "Circle K";
          else if (googleName.includes("Uno-X") || googleName.includes("UnoX")) inferredChain = "Uno-X";
          else if (googleName.includes("ESSO") || googleName.includes("Esso")) inferredChain = "ESSO";
          else if (googleName.includes("Shell")) inferredChain = "Shell";
          else if (googleName.includes("Statoil")) inferredChain = "Statoil";
          else if (googleName.includes("St1")) inferredChain = "St1";

          let reason = "missing_osm_station"; // default
          if (!inferredChain) {
            reason = "chain_not_in_osm";
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

        // Create FuelPrice for each fuel type (immutable observations, not overwrites)
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

          // Check for exact duplicate: same price, same sourceUpdatedAt
          // This avoids storing identical observations from repeated fetches
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
            // Deduplication: skip if identical price + sourceUpdatedAt
            if (
              last.priceNok === priceNok &&
              last.sourceUpdatedAt === sourceUpdatedAt
            ) {
              mapping.pricesSkipped++;
              continue;
            }
          }

          // Immutable observation: create new FuelPrice post for this observation
           await base44.entities.FuelPrice.create({
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
      stationsFound: mapping.matched.length + mapping.unmatched.length,
      pricesFound: mapping.pricesCreated + mapping.pricesSkipped,
      recordsCreated: mapping.pricesCreated,
      recordsSkipped: mapping.pricesSkipped,
      parserVersion: "gp_v1",
      notes: `Matched ${mapping.matched.length} stations, ${mapping.unmatched.length} unmatched. Confidence: conservative (chain + distance required).`
    });

    // Calculate statistics
    const totalUnmatched = Object.values(mapping.unmatched).reduce((sum, arr) => sum + arr.length, 0);
    const avgDistance = mapping.matched.length > 0 
      ? Math.round(mapping.matched.reduce((sum, m) => sum + m.matchDistanceMeters, 0) / mapping.matched.length)
      : 0;

    const matchRate = mapping.matched.length + totalUnmatched > 0 
      ? ((mapping.matched.length / (mapping.matched.length + totalUnmatched)) * 100).toFixed(1) + "%"
      : "0%";

    return Response.json({
      testValidation: {
        dataSource: "GooglePlaces Test API + OSM Fixture",
        osmSource: "fixture_15_stations_4_chains",
        googleplacesCoverage: "test_coordinates_oslo_trondheim_bergen_stavanger",
        matchingLogicStatus: "parser_validated_fixture_only",
        realWorldRepresentativity: "LOW – fixture-based OSM vs test GooglePlaces API. Cannot evaluate real coverage until live sources tested."
      },
      success: true,
      summary: {
        stationsMatched: mapping.matched.length,
        stationsUnmatched: totalUnmatched,
        matchRate: matchRate,
        matchRateWarning: `This ${matchRate} is NOT representative of real-world GooglePlaces coverage. Caused by: (1) OSM fixture has only 15 stations + 4 chains, (2) GooglePlaces test API returns ~75 stations from broader index, (3) Overlap between the two is limited. See docs/MATCHING_VALIDATION_STATUS.md`,
        averageMatchDistanceMeters: avgDistance,
        fuelPricesCreated: mapping.pricesCreated,
        fuelPricesSkipped: mapping.pricesSkipped
      },
      unmatchedBreakdown: {
        no_price_data: mapping.unmatched.no_price_data.length,
        chain_not_in_osm: mapping.unmatched.chain_not_in_osm.length,
        missing_osm_station: mapping.unmatched.missing_osm_station.length,
        distance_too_large: mapping.unmatched.distance_too_large.length
      },
      matched: mapping.matched.slice(0, 3),
      unmatchedSamples: {
        no_price_data: mapping.unmatched.no_price_data.slice(0, 2),
        chain_not_in_osm: mapping.unmatched.chain_not_in_osm.slice(0, 2),
        distance_too_large: mapping.unmatched.distance_too_large.slice(0, 2)
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});