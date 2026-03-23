import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * diagnosticPostParsingQuality
 * 
 * DIAGNOSTIKK BARE – INGEN ENDRINGER
 * 
 * Rapporterer på datakvalitet etter parsing:
 * 1. stationId dekning (gyldig vs manglende)
 * 2. plausibilityStatus fordeling (realistic vs suspect_low vs suspect_high)
 * 3. unmatched-årsaker
 * 4. dashboard-kvalitet (stationName dekning)
 * 5. konkrete eksempler
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hent alle GooglePlaces-observasjoner
    const allGooglePlaces = await base44.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-fetchedAt",
      500
    );

    // 1. STATIONID DEKNING
    const withStationId = allGooglePlaces.filter(p => p.stationId && p.stationId.trim());
    const missingStationId = allGooglePlaces.filter(p => !p.stationId || !p.stationId.trim());

    // 2. PLAUSIBILITY STATUS FORDELING
    const realistic = allGooglePlaces.filter(p => p.plausibilityStatus === "realistic_price");
    const suspectLow = allGooglePlaces.filter(p => p.plausibilityStatus === "suspect_price_low");
    const suspectHigh = allGooglePlaces.filter(p => p.plausibilityStatus === "suspect_price_high");
    const unclassified = allGooglePlaces.filter(p => !p.plausibilityStatus);

    // 3. UNMATCHED-ÅRSAKER (fra FetchLog eller observasjonen selv)
    // Merk: umatchede observasjoner ville ikke ha stationId eller vil ha lav confidence
    const lowConfidence = withStationId.filter(p => p.confidenceScore && p.confidenceScore < 0.7);

    // 4. DASHBOARD-KVALITET (stationName dekning)
    const withStationName = allGooglePlaces.filter(p => p.stationName && p.stationName.trim());
    const missingStationName = allGooglePlaces.filter(p => !p.stationName || !p.stationName.trim());

    // 5. KONKRETE EKSEMPLER (3 realistiske)
    const examples = realistic
      .filter(p => p.stationId && p.stationName)
      .sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt))
      .slice(0, 3)
      .map(p => ({
        stationId: p.stationId,
        stationName: p.stationName || "(mangler navn)",
        fuelType: p.fuelType,
        priceNok: p.priceNok,
        plausibilityStatus: p.plausibilityStatus,
        sourceUpdatedAt: p.sourceUpdatedAt || "ukjent",
        sourceName: p.sourceName,
        confidenceScore: p.confidenceScore,
        fetchedAt: p.fetchedAt,
        matched: p.stationId ? "✓ matched" : "✗ unmatched"
      }));

    // RAPPORT
    return Response.json({
      diagnosticReport: {
        reportGeneratedAt: new Date().toISOString(),
        totalGooglePlacesObservations: allGooglePlaces.length
      },
      
      stationIdCoverage: {
        total: allGooglePlaces.length,
        withValidStationId: withStationId.length,
        missingStationId: missingStationId.length,
        coveragePercent: allGooglePlaces.length > 0 
          ? ((withStationId.length / allGooglePlaces.length) * 100).toFixed(1) + "%"
          : "0%"
      },

      plausibilityDistribution: {
        total: allGooglePlaces.length,
        realistic_price: realistic.length,
        suspect_price_low: suspectLow.length,
        suspect_price_high: suspectHigh.length,
        unclassified: unclassified.length,
        realisticPercent: allGooglePlaces.length > 0
          ? ((realistic.length / allGooglePlaces.length) * 100).toFixed(1) + "%"
          : "0%"
      },

      matchingQuality: {
        total: allGooglePlaces.length,
        withStationId: withStationId.length,
        lowConfidenceMatches: lowConfidence.length,
        lowConfidencePercent: withStationId.length > 0
          ? ((lowConfidence.length / withStationId.length) * 100).toFixed(1) + "%"
          : "0%",
        note: "Low confidence = confidenceScore < 0.7 (geographic distance or weak chain match)"
      },

      dashboardQuality: {
        total: allGooglePlaces.length,
        withStationName: withStationName.length,
        missingStationName: missingStationName.length,
        stationNameCoveragePercent: allGooglePlaces.length > 0
          ? ((withStationName.length / allGooglePlaces.length) * 100).toFixed(1) + "%"
          : "0%",
        note: "Missing stationName may indicate unmatched or incomplete Station master data"
      },

      concreteExamples: {
        count: examples.length,
        examples: examples
      },

      analysis: {
        parsingStatus: realistic.length > 0 
          ? "✓ Parser fungerer – observasjoner lagres med realistiske priser"
          : "⚠ Parser-output mangler eller alle priser er klassifisert som suspect",
        matchingStatus: withStationId.length / allGooglePlaces.length > 0.7
          ? "✓ Matching dekning god (>70%)"
          : "⚠ Matching dekning lav (<70%)",
        dashboardStatus: withStationName.length / allGooglePlaces.length > 0.7
          ? "✓ Dashboard-visning tilstrekkelig"
          : "⚠ Mange observasjoner mangler stationName for visning",
        nextStep: withStationId.length === 0
          ? "Matching fungerer ikke – undersøk Station-katalog og matching-logikk"
          : realistic.length === 0
          ? "Plausibility-klassifisering uventet – sjekk terskler (10–30 NOK/L)"
          : "Datakvalitet akseptabel – fortsett med dashboard-analyse"
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});