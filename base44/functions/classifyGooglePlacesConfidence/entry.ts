import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all GooglePlaces fuel prices
    const allGooglePlacesPrices = await base44.entities.FuelPrice.filter({
      sourceName: "GooglePlaces"
    });

    // Fetch all stations
    const allStations = await base44.entities.Station.list();
    const stationMap = {};
    allStations.forEach(s => {
      stationMap[s.id] = s;
    });

    // Known matching metadata from earlier matching round
    const knownMatches = {
      "69aae827d83b11659bd89404": {
        googlePlaceName: "Esso",
        matchDistanceMeters: 34,
        confidenceLevel: "high_confidence_match",
        reason: "Exact chain match + close proximity (34m)"
      },
      "69aae828f4cd87a79b3e922a": {
        googlePlaceName: "Circle K Tunga",
        matchDistanceMeters: 5,
        confidenceLevel: "high_confidence_match",
        reason: "Exact name + chain match + very close (5m)"
      },
      "69aae82f8c0186903a326f9f": {
        googlePlaceName: "Uno-X 7-Eleven Blåsenborg",
        matchDistanceMeters: 218,
        confidenceLevel: "review_needed",
        reason: "Chain match confirmed but weak name match + moderate distance (218m) = requires validation"
      }
    };

    // Categorize all observations
    const observations = {
      high_confidence_match: [],
      review_needed: [],
      unmatched_not_found: []
    };

    const stationSummary = {
      high_confidence: {},
      review_needed: {}
    };

    for (const price of allGooglePlacesPrices) {
      const station = stationMap[price.stationId];
      
      if (!station) {
        observations.unmatched_not_found.push({
          stationId: price.stationId,
          fuelType: price.fuelType,
          priceNok: price.priceNok,
          error: "Station not found in catalog"
        });
        continue;
      }

      const metadata = knownMatches[price.stationId];
      
      if (!metadata) {
        observations.unmatched_not_found.push({
          stationId: price.stationId,
          stationName: station.name,
          fuelType: price.fuelType,
          priceNok: price.priceNok,
          error: "No matching metadata found"
        });
        continue;
      }

      const confidenceLevel = metadata.confidenceLevel;
      const observation = {
        stationId: price.stationId,
        stationName: station.name,
        stationChain: station.chain,
        googlePlaceName: metadata.googlePlaceName,
        fuelType: price.fuelType,
        priceNok: price.priceNok,
        matchDistanceMeters: metadata.matchDistanceMeters,
        reason: metadata.reason,
        fetchedAt: price.fetchedAt,
        sourceUpdatedAt: price.sourceUpdatedAt,
        confidenceScore: price.confidenceScore,
        plausibilityStatus: price.plausibilityStatus
      };

      observations[confidenceLevel].push(observation);

      // Track summary by station
      if (confidenceLevel === "high_confidence_match") {
        if (!stationSummary.high_confidence[price.stationId]) {
          stationSummary.high_confidence[price.stationId] = {
            stationName: station.name,
            chain: station.chain,
            priceCount: 0,
            fuelTypes: []
          };
        }
        stationSummary.high_confidence[price.stationId].priceCount++;
        if (!stationSummary.high_confidence[price.stationId].fuelTypes.includes(price.fuelType)) {
          stationSummary.high_confidence[price.stationId].fuelTypes.push(price.fuelType);
        }
      }

      if (confidenceLevel === "review_needed") {
        if (!stationSummary.review_needed[price.stationId]) {
          stationSummary.review_needed[price.stationId] = {
            stationName: station.name,
            chain: station.chain,
            googlePlaceName: metadata.googlePlaceName,
            matchDistance: metadata.matchDistanceMeters,
            reason: metadata.reason,
            priceCount: 0,
            fuelTypes: []
          };
        }
        stationSummary.review_needed[price.stationId].priceCount++;
        if (!stationSummary.review_needed[price.stationId].fuelTypes.includes(price.fuelType)) {
          stationSummary.review_needed[price.stationId].fuelTypes.push(price.fuelType);
        }
      }
    }

    return Response.json({
      reportDate: new Date().toISOString(),
      classificationSummary: {
        high_confidence_match: observations.high_confidence_match.length,
        review_needed: observations.review_needed.length,
        unmatched_not_found: observations.unmatched_not_found.length,
        totalObservations: allGooglePlacesPrices.length
      },
      stationSummary: {
        high_confidence_stations: Object.values(stationSummary.high_confidence).length,
        review_needed_stations: Object.values(stationSummary.review_needed).length,
        details_high_confidence: stationSummary.high_confidence,
        details_review_needed: stationSummary.review_needed
      },
      observations: observations,
      dashboardGuidance: {
        high_confidence_match: "Display normally. Can be used in merge logic and reporting.",
        review_needed: "Display with warning indicator. Do NOT use in merge logic or primary reporting until manually reviewed.",
        unmatched_not_found: "Log as error. Do not display to users."
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});