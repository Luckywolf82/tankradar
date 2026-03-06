import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Simulate three test records matching LogPrice logic
    const testEntries = [
      // Test 1: matched_station_id scenario
      {
        fuelType: "gasoline_95",
        priceNok: 19.85,
        priceType: "user_reported",
        sourceName: "user_reported",
        sourceUrl: null,
        sourceUpdatedAt: null,
        fetchedAt: new Date().toISOString(),
        sourceFrequency: "unknown",
        confidenceScore: 0.85,
        confidenceReason: "chain_match + name_similarity + distance_close",
        parserVersion: "user_reported_v1",
        plausibilityStatus: "realistic_price",
        locationLabel: "Oslo",
        rawPayloadSnippet: "User reported: gasoline_95 = 19.85 NOK/L",
        station_match_status: "matched_station_id",
        station_name: "Circle K Universitetsgata",
        station_chain: "Circle K",
        gps_latitude: 59.9139,
        gps_longitude: 10.7522
      },
      // Test 2: review_needed_station_match scenario
      {
        fuelType: "diesel",
        priceNok: 19.25,
        priceType: "user_reported",
        sourceName: "user_reported",
        sourceUrl: null,
        sourceUpdatedAt: null,
        fetchedAt: new Date().toISOString(),
        sourceFrequency: "unknown",
        confidenceScore: 0.50,
        confidenceReason: "ambiguous_station + uncertain_distance",
        parserVersion: "user_reported_v1",
        plausibilityStatus: "realistic_price",
        locationLabel: "Bergen",
        rawPayloadSnippet: "User reported: diesel = 19.25 NOK/L",
        station_match_status: "review_needed_station_match",
        station_name: "Uno-X Sentrum",
        station_chain: "Uno-X",
        gps_latitude: 60.3895,
        gps_longitude: 5.3221
      },
      // Test 3: no_safe_station_match scenario
      {
        fuelType: "gasoline_95",
        priceNok: 21.50,
        priceType: "user_reported",
        sourceName: "user_reported",
        sourceUrl: null,
        sourceUpdatedAt: null,
        fetchedAt: new Date().toISOString(),
        sourceFrequency: "unknown",
        confidenceScore: 0.30,
        confidenceReason: "no_station_match + gps_signal_only",
        parserVersion: "user_reported_v1",
        plausibilityStatus: "realistic_price",
        locationLabel: "Tromsø",
        rawPayloadSnippet: "User reported: gasoline_95 = 21.50 NOK/L",
        station_match_status: "no_safe_station_match",
        station_name: "Esso Sentrum",
        station_chain: "Esso",
        gps_latitude: 69.6492,
        gps_longitude: 18.9553
      }
    ];

    // Create test records
    const result = await base44.entities.FuelPrice.bulkCreate(testEntries);
    
    // Wait briefly for persistence
    await new Promise(resolve => setTimeout(resolve, 500));

    // Read back the newly created records
    const created = await base44.entities.FuelPrice.filter({
      priceType: "user_reported",
      sourceName: "user_reported"
    });

    // Find our test records by matching distinctive prices
    const testRecords = created.filter(r => 
      [19.85, 19.25, 21.50].includes(r.priceNok)
    ).sort((a, b) => b.priceNok - a.priceNok);

    if (testRecords.length < 3) {
      return Response.json({
        status: "PARTIAL",
        message: `Expected 3 test records, found ${testRecords.length}`,
        testRecords: testRecords.map(r => ({
          priceNok: r.priceNok,
          confidenceScore: r.confidenceScore,
          confidenceReason: r.confidenceReason,
          gps_latitude: r.gps_latitude,
          gps_longitude: r.gps_longitude,
          station_match_status: r.station_match_status
        }))
      });
    }

    // Extract and verify fields
    const verification = testRecords.map((record, idx) => ({
      id: record.id,
      scenario: idx === 0 ? "matched_station_id" : idx === 1 ? "review_needed" : "no_safe",
      priceNok: record.priceNok,
      confidenceScore: record.confidenceScore,
      confidenceScoreCorrect: 
        (idx === 0 && record.confidenceScore === 0.85) ||
        (idx === 1 && record.confidenceScore === 0.50) ||
        (idx === 2 && record.confidenceScore === 0.30),
      confidenceReason: record.confidenceReason,
      confidenceReasonPresent: !!record.confidenceReason,
      gps_latitude: record.gps_latitude,
      gps_longitude: record.gps_longitude,
      gpsPresent: record.gps_latitude !== null && record.gps_longitude !== null,
      station_match_status: record.station_match_status,
      station_name: record.station_name,
      station_chain: record.station_chain,
      locationLabel: record.locationLabel,
      fetchedAt: record.fetchedAt,
      sourceName: record.sourceName
    }));

    const allFieldsPersisted = verification.every(v => 
      v.confidenceScoreCorrect && 
      v.confidenceReasonPresent && 
      v.gpsPresent
    );

    return Response.json({
      status: allFieldsPersisted ? "SUCCESS" : "FAILED",
      summary: {
        totalCreated: testRecords.length,
        allFieldsPersisted: allFieldsPersisted,
        allConfidenceScoresCorrect: verification.every(v => v.confidenceScoreCorrect),
        allConfidenceReasonsPresent: verification.every(v => v.confidenceReasonPresent),
        allGpsDataPresent: verification.every(v => v.gpsPresent)
      },
      records: verification
    });
  } catch (error) {
    return Response.json({ 
      status: "ERROR", 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});