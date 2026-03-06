import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * reportDashboardData
 * 
 * Diagnostic function to show:
 * - 3 concrete examples of station + historical price observations
 * - Data sources per observation
 * - Observation counts
 * - Current limitations in history depth
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all GooglePlaces prices
    const googlePlacesPrices = await base44.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-fetchedAt",
      200
    );

    // Group by stationId + fuelType
    const groups = {};
    googlePlacesPrices.forEach(obs => {
      const key = `${obs.stationId}_${obs.fuelType}`;
      if (!groups[key]) {
        groups[key] = {
          stationId: obs.stationId,
          stationName: obs.stationName || obs.locationLabel || "(Ukjent)",
          chain: obs.chain || "(Ukjent)",
          fuelType: obs.fuelType,
          sourceName: obs.sourceName,
          observations: []
        };
      }
      groups[key].observations.push({
        priceNok: obs.priceNok,
        sourceUpdatedAt: obs.sourceUpdatedAt,
        fetchedAt: obs.fetchedAt,
        confidenceScore: obs.confidenceScore,
        parserVersion: obs.parserVersion
      });
    });

    const groupArray = Object.values(groups)
      .sort((a, b) => b.observations.length - a.observations.length);

    // Take top 3
    const examples = groupArray.slice(0, 3).map(group => ({
      stationId: group.stationId,
      stationName: group.stationName,
      chain: group.chain,
      fuelType: group.fuelType,
      observationCount: group.observations.length,
      dataSource: group.sourceName,
      observations: group.observations
        .sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt))
        .slice(0, 5) // Last 5
        .map((obs, idx) => ({
          sequence: idx + 1,
          priceNok: obs.priceNok,
          sourceUpdatedAt: obs.sourceUpdatedAt,
          fetchedAt: obs.fetchedAt,
          confidenceScore: obs.confidenceScore,
          parserVersion: obs.parserVersion
        }))
    }));

    return Response.json({
      diagnostic: "DASHBOARD DATA REPORT",
      reportDate: new Date().toISOString(),
      
      summary: {
        totalStationsFuelTypeCombos: groupArray.length,
        totalObservations: googlePlacesPrices.length,
        dataSource: "GooglePlaces (supplement, station_level)"
      },

      concreteExamples: examples,

      limitations: {
        dataHistory: "Currently only observations from live Google Places API (today onwards)",
        historicalDepth: "No backfill from historical data sources yet",
        coverage: "Limited to matched stations in OpenStreetMap + GooglePlaces",
        dataGranularity: "station_level only for GooglePlaces",
        updateFrequency: "near_realtime (depends on Google Places API update frequency)",
        nextSteps: "1. Create automated fetcher, 2. Implement historical aggregation, 3. Add merge-engine for multi-source conflation"
      },

      dataSchemaUsed: {
        FuelPrice: {
          required: ["stationId", "fuelType", "priceNok", "sourceName", "fetchedAt"],
          recommended: ["sourceUpdatedAt", "confidenceScore", "sourceFrequency", "parserVersion"],
          priceType: "station_level"
        }
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});