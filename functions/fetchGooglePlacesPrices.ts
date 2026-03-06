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
  const normalized = name.toLowerCase().trim();
  
  const chainMap = {
    "esso norway": "esso",
    "essono": "esso",
    "essopluss": "esso",
    "circlekiosk": "circle k",
    "circlekiosks": "circle k",
    "circlek": "circle k",
    "unoxpress": "uno-x",
    "unox": "uno-x",
    "statoilservice": "statoil",
    "statoilspesial": "statoil"
  };
  
  const mapped = chainMap[normalized] || normalized;
  return mapped.charAt(0).toUpperCase() + mapped.slice(1);
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
function extractPriceNok(priceObj) {
  if (!priceObj || priceObj.currencyCode !== "NOK") return null;
  const units = priceObj.units || 0;
  const nanos = priceObj.nanos || 0;
  return units + (nanos / 1e9);
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

// Conservative matching: name + normalized chain + geographic proximity
function matchStationToPriceSource(googlePlace, allStations) {
  const googleName = googlePlace.displayName?.text || "";
  const googleLat = googlePlace.location?.latitude;
  const googleLon = googlePlace.location?.longitude;

  if (!googleLat || !googleLon) return null;

  let bestMatch = null;
  let bestDistance = Infinity;
  let bestConfidence = 0;

  // Infer chain from Google name
  let inferredChain = null;
  if (googleName.includes("Circle K")) inferredChain = "Circle K";
  else if (googleName.includes("Uno-X") || googleName.includes("UnoX")) inferredChain = "Uno-X";
  else if (googleName.includes("ESSO") || googleName.includes("Esso")) inferredChain = "ESSO";
  else if (googleName.includes("Shell")) inferredChain = "Shell";
  else if (googleName.includes("Statoil")) inferredChain = "Statoil";
  else if (googleName.includes("St1")) inferredChain = "St1";

  if (!inferredChain) return null; // No chain match = no match

  const normalizedGoogleChain = normalizeChain(inferredChain);

  for (const station of allStations) {
    if (!station.latitude || !station.longitude) continue;

    // Calculate distance in meters using Haversine
    const distanceMeters = haversineDistance(googleLat, googleLon, station.latitude, station.longitude);

    // Normalize station chain for comparison
    const normalizedStationChain = normalizeChain(station.chain);

    // Chain must match (after normalization)
    if (normalizedGoogleChain !== normalizedStationChain) continue;

    // Assign confidence based on distance and name match
    let confidence = 0;
    if (distanceMeters < 50 && googleName.toLowerCase().includes(station.name?.toLowerCase() || "")) {
      confidence = 0.90; // High: chain + address + close + name match
    } else if (distanceMeters < 100) {
      confidence = 0.80; // Moderate: chain + close distance
    } else if (distanceMeters < 200) {
      confidence = 0.60; // Weak: chain + moderate distance
    } else {
      continue; // Distance too large
    }

    if (distanceMeters < bestDistance) {
      bestMatch = { station, distanceMeters, confidence };
      bestDistance = distanceMeters;
      bestConfidence = confidence;
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

    // Load all existing stations from OSM (station master)
    const allStations = await base44.entities.Station.list();
    
    if (allStations.length === 0) {
      return Response.json({
        error: "No stations in database. Run fetchOpenStreetMapStations first.",
        hint: "OSM station catalog is required for GooglePlaces matching."
      }, { status: 400 });
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

        // Create FuelPrice for each fuel type
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

          // Check if price already exists (avoid duplicates)
          const existing = await base44.entities.FuelPrice.filter({
            stationId: station.id,
            fuelType: fuelType,
            sourceName: "GooglePlaces"
          });

          if (existing.length > 0) {
            // Update existing price
            await base44.entities.FuelPrice.update(existing[0].id, {
              priceNok: priceNok,
              fetchedAt: new Date().toISOString(),
              sourceUpdatedAt: fuelPrice.updateTime || null,
              confidenceScore: matchResult.confidence
            });
            mapping.pricesCreated++;
          } else {
            // Create new price with confidence score from match quality
            await base44.entities.FuelPrice.create({
              stationId: station.id,
              fuelType: fuelType,
              priceNok: priceNok,
              priceType: "station_level",
              sourceName: "GooglePlaces",
              sourceUrl: null,
              sourceUpdatedAt: fuelPrice.updateTime || null,
              fetchedAt: new Date().toISOString(),
              sourceFrequency: "near_realtime",
              confidenceScore: matchResult.confidence,
              parserVersion: "gp_v1",
              rawPayloadSnippet: `${fuelPrice.type} ${priceNok} NOK`
            });
            mapping.pricesCreated++;
          }
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

    return Response.json({
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