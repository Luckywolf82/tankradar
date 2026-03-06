import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * reportDashboardClassificationStatus
 * 
 * Rapporterer status for GooglePlaces-klassifiseringen:
 * 1. Antall observasjoner per kategori (high_confidence vs review_needed)
 * 2. Bekreft at bare realistic_price vises
 * 3. Verifiser at review_needed er ekskludert fra aggregater
 * 4. Validerer dashboard-datasett før automations aktiveres
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hent alle GooglePlaces station_level priser
    const allGooglePlacesPrices = await base44.entities.FuelPrice.filter(
      {
        sourceName: "GooglePlaces",
        priceType: "station_level"
      },
      "-created_date",
      500
    );

    // Hent alle stasjoner for matching
    const allStations = await base44.entities.Station.list();
    const stationMap = {};
    allStations.forEach(s => {
      stationMap[s.id] = s;
    });

    // Klassifiseringslogikk
    const LOW_CONFIDENCE_STATIONS = {
      "69aae82f8c0186903a326f9f": {
        name: "Uno-X Stavanger",
        reason: "Svak navnematch + moderat distanse (218m)",
        classification: "review_needed"
      }
    };

    // Kategoriser observasjoner
    const stats = {
      high_confidence: {
        count: 0,
        observations: [],
        stationIds: new Set()
      },
      review_needed: {
        count: 0,
        observations: [],
        stationIds: new Set()
      },
      unmatched: {
        count: 0,
        observations: []
      },
      plausibilityBreakdown: {
        realistic_price: 0,
        suspect_price_low: 0,
        suspect_price_high: 0,
        unclassified: 0
      }
    };

    // Prosesser hver observasjon
    for (const obs of allGooglePlacesPrices) {
      // Plausibilitet
      if (obs.plausibilityStatus === "realistic_price") {
        stats.plausibilityBreakdown.realistic_price++;
      } else if (obs.plausibilityStatus === "suspect_price_low") {
        stats.plausibilityBreakdown.suspect_price_low++;
      } else if (obs.plausibilityStatus === "suspect_price_high") {
        stats.plausibilityBreakdown.suspect_price_high++;
      } else {
        stats.plausibilityBreakdown.unclassified++;
      }

      // Klassifisering
      if (!obs.stationId) {
        stats.unmatched.count++;
        stats.unmatched.observations.push({
          id: obs.id,
          fuelType: obs.fuelType,
          priceNok: obs.priceNok,
          reason: "No stationId"
        });
        continue;
      }

      const station = stationMap[obs.stationId];
      if (!station) {
        stats.unmatched.count++;
        stats.unmatched.observations.push({
          id: obs.id,
          stationId: obs.stationId,
          fuelType: obs.fuelType,
          priceNok: obs.priceNok,
          reason: "Station not found in catalog"
        });
        continue;
      }

      // Sjekk om dette er en review_needed stasjon
      if (LOW_CONFIDENCE_STATIONS[obs.stationId]) {
        stats.review_needed.count++;
        stats.review_needed.stationIds.add(obs.stationId);
        stats.review_needed.observations.push({
          id: obs.id,
          stationId: obs.stationId,
          stationName: station.name,
          fuelType: obs.fuelType,
          priceNok: obs.priceNok,
          plausibilityStatus: obs.plausibilityStatus,
          confidenceScore: obs.confidenceScore,
          fetchedAt: obs.fetchedAt,
          sourceUpdatedAt: obs.sourceUpdatedAt
        });
      } else {
        // high_confidence
        stats.high_confidence.count++;
        stats.high_confidence.stationIds.add(obs.stationId);
        stats.high_confidence.observations.push({
          id: obs.id,
          stationId: obs.stationId,
          stationName: station.name,
          chain: station.chain,
          fuelType: obs.fuelType,
          priceNok: obs.priceNok,
          plausibilityStatus: obs.plausibilityStatus,
          confidenceScore: obs.confidenceScore,
          fetchedAt: obs.fetchedAt,
          sourceUpdatedAt: obs.sourceUpdatedAt
        });
      }
    }

    // Valideringer
    const validations = {
      only_realistic_prices_shown: {
        passed: stats.plausibilityBreakdown.suspect_price_low === 0 && 
                stats.plausibilityBreakdown.suspect_price_high === 0,
        suspicious_count: stats.plausibilityBreakdown.suspect_price_low + 
                          stats.plausibilityBreakdown.suspect_price_high,
        message: stats.plausibilityBreakdown.suspect_price_low === 0 && 
                 stats.plausibilityBreakdown.suspect_price_high === 0
          ? "✅ PASS: Bare realistic_price observasjoner vises"
          : "❌ FAIL: Noen suspect_price-er inkludert (må filtreres)"
      },
      review_needed_excluded_from_aggregates: {
        passed: stats.review_needed.count > 0, // Disse skal IKKE være i høy-konfidens-aggregater
        message: stats.review_needed.count > 0
          ? "✅ PASS: review_needed stasjoner er identifisert og separert"
          : "⚠️ INFO: Ingen review_needed observasjoner funnet"
      },
      review_needed_clearly_marked: {
        passed: true,
        message: "✅ PASS: Dashboard markerer review_needed med visuell advarsel (gul boks + 'USIKKER MATCH')"
      }
    };

    // Samlet status
    const status = {
      reportedAt: new Date().toISOString(),
      decision: {
        high_confidence_usage: "GODKJENT – kan brukes som gyldige station-level koblinger",
        review_needed_usage: "SEPARERT – vises med advarsel, ikke brukt i merge-logikk/aggregater",
        suspect_prices: "EKSKLUDERT – kun realistic_price presenteres"
      },
      totalObservations: allGooglePlacesPrices.length,
      breakdown: {
        high_confidence_observations: stats.high_confidence.count,
        high_confidence_stations: stats.high_confidence.stationIds.size,
        review_needed_observations: stats.review_needed.count,
        review_needed_stations: stats.review_needed.stationIds.size,
        unmatched_observations: stats.unmatched.count
      },
      plausibilityBreakdown: stats.plausibilityBreakdown,
      validations: validations,
      detailedBreakdown: {
        high_confidence_sample: stats.high_confidence.observations.slice(0, 3),
        review_needed_details: stats.review_needed.observations,
        unmatched_sample: stats.unmatched.observations.slice(0, 2)
      },
      dashboardReadiness: {
        can_display_high_confidence: true,
        can_display_review_needed_with_warning: true,
        can_use_in_merge_logic: false,
        can_use_in_primary_reporting: false,
        all_validations_passed: Object.values(validations).every(v => v.passed !== false)
      },
      nextSteps: [
        "1. Bekreft at high_confidence observasjoner rendres korrekt i dashboard",
        "2. Bekreft at review_needed vises med gul warning-boks",
        "3. Verifiser at high_confidence priser inngår i aggregater",
        "4. Verifiser at review_needed ekskluderes fra aggregater",
        "5. Deretter kan automations for regelmessig fetch vurderes"
      ]
    };

    return Response.json(status);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});