import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * diagnosticMissingStationReferences
 * 
 * DIAGNOSTIKK KUN – INGEN REPARASJONER
 * 
 * Undersøker referensiell integritet for GooglePlaces-poster:
 * - Henter de 4 gjenværende postene
 * - Sjekker om stationId finnes i Station-katalogen
 * - Klassifiserer årsak til manglende referanser
 * - Sammenligner timeline
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hent de 4 gjenværende GooglePlaces-poster
    const googlePlacesPosts = await base44.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-fetchedAt",
      500
    );

    // Hent alle Stations
    const allStations = await base44.entities.Station.list();

    // Build station map
    const stationMap = {};
    for (const station of allStations) {
      stationMap[station.id] = station;
    }

    // Analyser hver GooglePlaces-post
    const postDetails = [];
    const missingReferences = [];

    for (const post of googlePlacesPosts) {
      const detail = {
        stationId: post.stationId || "null",
        fuelType: post.fuelType,
        priceNok: post.priceNok,
        createdAt: post.created_date,
        fetchedAt: post.fetchedAt,
        sourceUpdatedAt: post.sourceUpdatedAt || "null",
        existsInStationCatalog: post.stationId && stationMap[post.stationId] ? "yes" : "no"
      };

      postDetails.push(detail);

      // Hvis stationId mangler eller peker til ikke-eksisterende station
      if (!post.stationId || !stationMap[post.stationId]) {
        missingReferences.push({
          stationId: post.stationId || "null",
          fuelType: post.fuelType,
          createdAt: post.created_date,
          fetchedAt: post.fetchedAt
        });
      }
    }

    // Klassifiser årsaker
    const classificationRules = (stationId) => {
      if (!stationId) {
        return "never_created"; // stationId var aldri satt
      }
      if (stationMap[stationId]) {
        return "exists"; // Finnes, ikke problem
      }
      // Hvis det ikke finnes, kunne være:
      // - deleted (ble slettet etter at prisen ble opprettet)
      // - never_created (matching skrev stationId som ikke ble persistert)
      // - test_artifact (test-data som ikke skulle vært der)
      // - legacy_matching_reference (fra eldre matching-versjon)
      return "unknown"; // Trenger mer kontekst
    };

    const classifiedIssues = missingReferences.map(item => ({
      stationId: item.stationId,
      classification: classificationRules(item.stationId),
      createdAt: item.createdAt,
      note: item.stationId === "null"
        ? "stationId var aldri satt – matching feilet eller ble ikke kjørt"
        : "stationId finnes ikke i Station-katalogen – kunne vært slettet eller aldri persistert"
    }));

    // Hent FetchLog for å sammenligne timeline
    const recentFetchLogs = await base44.asServiceRole.entities.FetchLog.filter(
      { sourceName: "GooglePlaces" },
      "-finishedAt",
      10
    );

    const oldestPostCreated = googlePlacesPosts.length > 0
      ? new Date(googlePlacesPosts[googlePlacesPosts.length - 1].created_date)
      : null;
    const newestPostCreated = googlePlacesPosts.length > 0
      ? new Date(googlePlacesPosts[0].created_date)
      : null;
    const lastFetchLog = recentFetchLogs.length > 0 ? recentFetchLogs[0] : null;

    const timelineAnalysis = {
      oldestGooglePlacesPostCreated: oldestPostCreated?.toISOString() || "N/A",
      newestGooglePlacesPostCreated: newestPostCreated?.toISOString() || "N/A",
      lastFetchLogFinished: lastFetchLog?.finishedAt || "N/A",
      lastFetchLogSuccessful: lastFetchLog?.success || false,
      allPostsCreatedDuringLastFetch: lastFetchLog && oldestPostCreated && newestPostCreated
        ? oldestPostCreated >= new Date(lastFetchLog.startedAt) && newestPostCreated <= new Date(lastFetchLog.finishedAt)
        : "unknown"
    };

    return Response.json({
      diagnosticTimestamp: new Date().toISOString(),

      googlePlacesPosts: {
        total: googlePlacesPosts.length,
        details: postDetails
      },

      referentialIntegrity: {
        missingReferences: missingReferences.length,
        classifications: classifiedIssues,
        summary: missingReferences.length > 0
          ? `🚨 ${missingReferences.length}/${googlePlacesPosts.length} poster refererer til ikke-eksisterende Stations`
          : "✓ Alle poster har gyldig stationId"
      },

      timeline: timelineAnalysis,

      diagnosis: {
        problemType: missingReferences.length > 0
          ? classifiedIssues.every(c => c.stationId === "null")
            ? "MATCHING_FAILED: stationId aldri satt"
            : "REFERENTIAL_INTEGRITY: stationId peker til ikke-eksisterende records"
          : "NO_PROBLEM",

        rootCauseHypothesis: classifiedIssues.length > 0
          ? classifiedIssues.every(c => c.stationId === "null")
            ? "Matching-funksjonen kjørte ikke eller mislyktes for disse stasjonene"
            : classifiedIssues.every(c => c.classification === "never_created")
            ? "Station-records ble aldri persistert selv om matching opprettet referanser"
            : "Station-records ble slettet etter at GooglePlaces-poster ble opprettet"
          : "N/A",

        dataQuality: missingReferences.length === 0
          ? "✓ Alle GooglePlaces-poster har intakte referanser"
          : `⚠ ${missingReferences.length} poster er som orphans i databasen – kan ikke vises i dashboard`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});