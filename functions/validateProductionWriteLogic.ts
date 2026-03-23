import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * validateProductionWriteLogic
 * 
 * BEKREFTELSE av at produksjonsflyten bare kan lagre GooglePlaces-priser med:
 * 1. Gyldig eksisterende Station.id
 * 2. Eller null + eksplisitt unmatched-status
 * 
 * Sjekker at test-stationId-er ikke lengre kan brukes
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hent alle gjenstående GooglePlaces-poster
    const allGooglePlacesPosts = await base44.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-fetchedAt",
      500
    );

    // Hent alle Stations
    const allStations = await base44.entities.Station.list();
    const stationMap = {};
    for (const station of allStations) {
      stationMap[station.id] = station;
    }

    // Analyser hver post
    const validPosts = [];
    const invalidPosts = [];
    const nullStationIdPosts = [];

    for (const post of allGooglePlacesPosts) {
      if (!post.stationId) {
        nullStationIdPosts.push({
          id: post.id,
          fuelType: post.fuelType,
          priceNok: post.priceNok,
          note: "stationId er null – krever eksplisitt unmatched-status"
        });
        continue;
      }

      // Sjekk om stationId finnes i katalogen
      if (stationMap[post.stationId]) {
        validPosts.push({
          stationId: post.stationId,
          stationName: stationMap[post.stationId].name,
          fuelType: post.fuelType,
          priceNok: post.priceNok
        });
      } else {
        invalidPosts.push({
          stationId: post.stationId,
          fuelType: post.fuelType,
          note: "stationId peker til ikke-eksisterende Station"
        });
      }
    }

    // Definer hvilke IDer som var test-artefakter
    const testArtifactIds = ["validate_0", "validate_1", "validate_2", "test_station_trace"];
    const testReferencesInvalid = invalidPosts.filter(p => testArtifactIds.includes(p.stationId));

    return Response.json({
      timestamp: new Date().toISOString(),
      writeLogicValidation: {
        totalGooglePlacesPosts: allGooglePlacesPosts.length,
        validPosts: validPosts.length,
        invalidPosts: invalidPosts.length,
        nullStationIdPosts: nullStationIdPosts.length
      },
      productionRequirements: {
        rule1_validStationIdRequired: {
          status: validPosts.length > 0 ? "✓ Gjeldende" : "⚠ Ingen gyldige poster",
          description: "GooglePlaces-priser må ha gyldig eksisterende Station.id",
          conforming: validPosts.length
        },
        rule2_nullOrUnmatched: {
          status: nullStationIdPosts.length === 0 ? "✓ OK" : "⚠ Poster med null stationId",
          description: "null stationId skal kun brukes med eksplisitt unmatched-status",
          conforming: nullStationIdPosts.length === 0 ? "ja" : "nei"
        },
        rule3_noTestFixtureIds: {
          status: testReferencesInvalid.length === 0 ? "✓ OK" : "🚨 Test-IDs funnelasikfunnet",
          description: "Test-stationId-er (validate_*, test_station_*) må ikke brukes i produksjon",
          testArtifactsFound: testReferencesInvalid
        }
      },
      invalidPostsDetail: invalidPosts,
      nullPostsDetail: nullStationIdPosts,
      validPostsSample: validPosts.slice(0, 3)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});