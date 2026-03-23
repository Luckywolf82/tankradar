import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Create a test review_needed record with candidates
    const testRecord = {
      priceType: "user_reported",
      fuelType: "diesel",
      priceNok: 19.55,
      sourceName: "user_reported",
      sourceFrequency: "unknown",
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt: null,
      parserVersion: "user_reported_v1",
      confidenceScore: 0.5,
      confidenceReason: "test: review_needed with candidates",
      plausibilityStatus: "realistic_price",
      station_match_status: "review_needed_station_match",
      station_name: "Test Uno-X Station",
      station_chain: "Uno-X",
      locationLabel: "Stavanger",
      gps_latitude: 58.9689,
      gps_longitude: 5.7332,
      station_match_candidates: ["69aaded7751d6acf53c21ae8", "69aad1c40df45816c136d507"],
      station_match_notes: "Test: 2 candidate stations found during matching"
    };

    // Create the record
    const created = await base44.entities.FuelPrice.create(testRecord);

    // Step 2: Wait briefly then read it back
    await new Promise(resolve => setTimeout(resolve, 500));
    const retrieved = await base44.entities.FuelPrice.filter({ id: created.id });

    if (!retrieved || retrieved.length === 0) {
      return Response.json({
        status: "RETRIEVAL_FAILED",
        message: "Record was created but could not be retrieved",
        created_id: created.id
      }, { status: 500 });
    }

    const record = retrieved[0];

    // Step 3: Verify all fields
    const verification = {
      id: record.id,
      created_successfully: true,
      fields_verified: {
        station_match_status: {
          expected: "review_needed_station_match",
          actual: record.station_match_status,
          match: record.station_match_status === "review_needed_station_match"
        },
        station_match_candidates: {
          expected: ["69aaded7751d6acf53c21ae8", "69aad1c40df45816c136d507"],
          actual: record.station_match_candidates,
          count: record.station_match_candidates?.length || 0,
          match: Array.isArray(record.station_match_candidates) && record.station_match_candidates.length === 2
        },
        station_match_notes: {
          expected: "Test: 2 candidate stations found during matching",
          actual: record.station_match_notes,
          match: record.station_match_notes === "Test: 2 candidate stations found during matching"
        },
        confidenceScore: {
          expected: 0.5,
          actual: record.confidenceScore,
          match: record.confidenceScore === 0.5
        },
        confidenceReason: {
          expected: "test: review_needed with candidates",
          actual: record.confidenceReason,
          match: record.confidenceReason === "test: review_needed with candidates"
        },
        priceNok: {
          expected: 19.55,
          actual: record.priceNok,
          match: record.priceNok === 19.55
        },
        gps_data: {
          latitude: record.gps_latitude,
          longitude: record.gps_longitude,
          present: record.gps_latitude !== null && record.gps_longitude !== null
        }
      },
      all_fields_correct: true // Will be set below
    };

    // Check if all fields match
    const fieldMatches = Object.entries(verification.fields_verified).map(([key, field]) => {
      if (typeof field === 'object' && 'match' in field) {
        return field.match;
      }
      return true;
    });
    verification.all_fields_correct = fieldMatches.every(m => m === true);

    return Response.json({
      status: verification.all_fields_correct ? "SUCCESS" : "PARTIAL_SUCCESS",
      record_id: record.id,
      verification,
      summary: {
        candidates_persisted: record.station_match_candidates?.length === 2,
        candidates_count: record.station_match_candidates?.length || 0,
        is_review_needed: record.station_match_status === "review_needed_station_match",
        confidence_score: record.confidenceScore,
        all_fields_correct: verification.all_fields_correct
      }
    });
  } catch (error) {
    return Response.json({ 
      status: "ERROR", 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});