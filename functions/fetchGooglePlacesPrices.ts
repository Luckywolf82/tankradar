import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Test locations for multi-city coverage
const TEST_LOCATIONS = {
  oslo: { latitude: 59.9139, longitude: 10.7522, name: "Oslo sentrum", radiusMeters: 5000 },
  trondheim: { latitude: 63.4305, longitude: 10.3951, name: "Trondheim sentrum", radiusMeters: 5000 },
  bergen: { latitude: 60.3895, longitude: 5.3221, name: "Bergen sentrum", radiusMeters: 5000 },
  stavanger: { latitude: 58.9701, longitude: 5.7331, name: "Stavanger sentrum", radiusMeters: 5000 }
};

// Normalize Google fuel types to standard types
function normalizeFuelType(googleType) {
  const mapping = {
    "SP95": "gasoline_95",
    "SP98": "gasoline_98",
    "DIESEL": "diesel"
  };
  return mapping[googleType] || null;
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

// Conservative matching: name + chain + geographic proximity
function matchStationToPriceSource(googlePlace, allStations) {
  const googleName = googlePlace.displayName?.text || "";
  const googleLat = googlePlace.location?.latitude;
  const googleLon = googlePlace.location?.longitude;

  if (!googleLat || !googleLon) return null;

  // Pass 1: Exact name match + chain inference
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const station of allStations) {
    if (!station.latitude || !station.longitude) continue;

    // Calculate distance (simple Euclidean approximation)
    const dlat = Math.abs(station.latitude - googleLat);
    const dlon = Math.abs(station.longitude - googleLon);
    const distance = Math.sqrt(dlat * dlat + dlon * dlon);

    // Try to infer chain from Google name
    let inferredChain = null;
    if (googleName.includes("Circle K")) inferredChain = "Circle K";
    else if (googleName.includes("Uno-X")) inferredChain = "Uno-X";
    else if (googleName.includes("ESSO") || googleName.includes("Esso")) inferredChain = "ESSO";
    else if (googleName.includes("Shell")) inferredChain = "Shell";
    else if (googleName.includes("Statoil")) inferredChain = "Statoil";

    // Matching logic:
    // 1. If chain matches AND name matches AND distance < 200m → high confidence
    // 2. If chain matches AND distance < 100m → moderate confidence
    // 3. Otherwise → no match (don't guess)
    
    const nameMatches = station.name && googleName.toLowerCase().includes(station.name.toLowerCase().trim());
    const chainMatches = inferredChain && station.chain && inferredChain.toLowerCase() === station.chain.toLowerCase();
    
    if (chainMatches && (nameMatches || distance < 100) && distance < 200) {
      if (distance < bestDistance) {
        bestMatch = { station, distance, confidence: 0.80 };
        bestDistance = distance;
      }
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
      unmatched: [],
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

        if (fuelOptions.length === 0) {
          mapping.unmatched.push({
            googlePlace: googleName,
            location: location.name,
            reason: "No fuel prices in fuelOptions"
          });
          continue;
        }

        // Try to match
        const matchResult = matchStationToPriceSource(googlePlace, allStations);

        if (!matchResult) {
          mapping.unmatched.push({
            googlePlace: googleName,
            location: location.name,
            address: googlePlace.formattedAddress,
            reason: "Could not match to OSM station (no chain inference or distance > 200m)"
          });
          continue;
        }

        const station = matchResult.station;
        mapping.matched.push({
          googlePlace: googleName,
          station: station.name,
          stationId: station.id,
          distance: matchResult.distance.toFixed(4),
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
            // Create new price
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

    return Response.json({
      success: true,
      summary: {
        stationsMatched: mapping.matched.length,
        stationsUnmatched: mapping.unmatched.length,
        fuelPricesCreated: mapping.pricesCreated,
        fuelPricesSkipped: mapping.pricesSkipped
      },
      matched: mapping.matched.slice(0, 3),
      unmatched: mapping.unmatched.slice(0, 5)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});