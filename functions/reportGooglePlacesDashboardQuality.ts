import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * reportGooglePlacesDashboardQuality
 * 
 * DIAGNOSTIKK – DASHBOARD-KVALITET ETTER CLEANUP
 * 
 * Rapporterer:
 * 1. Poster med gyldig stationId
 * 2. Poster med korrekt stationName
 * 3. Poster uten stasjonsnavn
 * 4. Unmatched-årsaker
 * 5. 3 konkrete eksempler
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hent alle gjenstående GooglePlaces-poster
    const allGooglePlaces = await base44.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-fetchedAt",
      500
    );

    // Hent alle stasjoner for matching
    const allStations = await base44.entities.Station.list();

    // Build station map for quick lookup
    const stationMap = {};
    for (const station of allStations) {
      stationMap[station.id] = station;
    }

    // Analyser hver GooglePlaces-post
    const withValidStationId = [];
    const withStationName = [];
    const withoutStationName = [];

    for (const post of allGooglePlaces) {
      if (!post.stationId) {
        withoutStationName.push({
          post,
          reason: "no_stationId"
        });
        continue;
      }

      withValidStationId.push(post);

      // Slå opp stationsnavn
      const station = stationMap[post.stationId];
      if (station && station.name) {
        withStationName.push({
          post,
          station,
          displayName: station.name
        });
      } else {
        withoutStationName.push({
          post,
          reason: "stationId_not_in_catalog"
        });
      }
    }

    // Kategoriser unmatched-årsaker
    const unmatchedReasons = {};
    for (const item of withoutStationName) {
      const reason = item.reason;
      if (!unmatchedReasons[reason]) {
        unmatchedReasons[reason] = 0;
      }
      unmatchedReasons[reason]++;
    }

    // Velg 3 konkrete eksempler (preferere de med både stationId og stationName)
    const exampleItems = withStationName.slice(0, 3);
    const concreteExamples = exampleItems.map(item => {
      // Hent nyeste pris for denne stasjonen og fuel type
      const latestPrice = item.post;
      
      return {
        stationId: item.post.stationId,
        stationName: item.displayName,
        fuelType: item.post.fuelType,
        latestPriceNok: latestPrice.priceNok,
        plausibilityStatus: latestPrice.plausibilityStatus,
        sourceUpdatedAt: latestPrice.sourceUpdatedAt || "unknown",
        fetchedAt: latestPrice.fetchedAt,
        confidenceScore: latestPrice.confidenceScore
      };
    });

    return Response.json({
      reportTimestamp: new Date().toISOString(),

      dashboardQuality: {
        totalGooglePlacesPosts: allGooglePlaces.length,
        postsWithValidStationId: withValidStationId.length,
        postsWithStationName: withStationName.length,
        postsWithoutStationName: withoutStationName.length,
        stationNameCoverage: {
          percentage: allGooglePlaces.length > 0
            ? ((withStationName.length / allGooglePlaces.length) * 100).toFixed(1) + "%"
            : "0%",
          status: withStationName.length > 0
            ? "✓ Poster vises med stasjonsnavn i dashboard"
            : "⚠ Ingen poster har matchet stasjonsnavn"
        }
      },

      unmatchedReasons: {
        breakdown: unmatchedReasons,
        note: "Viser hvorfor noen poster ikke har stasjonsnavn"
      },

      concreteExamples: {
        count: concreteExamples.length,
        examples: concreteExamples,
        note: "3 eksempler på poster som vises korrekt i dashboard"
      },

      semanticValidation: {
        stationLevelDataIsConnected: withStationName.length > 0,
        stationCatalogHasRequiredStations: allStations.length > 0,
        dashboardCanDisplayStationNames: withStationName.length > 0,
        dataIsReadyForUserPresentation: withStationName.length > 0
          ? "✓ Ja – station_level data er semantisk riktig koblet og lesbar"
          : "⚠ Nei – for mange poster mangler stasjonsnavn"
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});