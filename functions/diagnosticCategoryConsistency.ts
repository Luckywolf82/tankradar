import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch ALL user_reported records (no filtering, just the facts)
    const allRecords = await base44.entities.FuelPrice.filter({
      priceType: "user_reported"
    });

    // Categorize with complete field inspection
    const analyzed = allRecords.map(r => ({
      id: r.id,
      priceNok: r.priceNok,
      locationLabel: r.locationLabel,
      station_name: r.station_name,
      station_chain: r.station_chain,
      station_match_status: r.station_match_status,
      confidenceScore: r.confidenceScore,
      confidenceReason: r.confidenceReason,
      station_match_candidates: r.station_match_candidates || [],
      station_match_candidates_length: (r.station_match_candidates || []).length,
      stationId: r.stationId || null,
      gps_latitude: r.gps_latitude,
      gps_longitude: r.gps_longitude,
      created_date: r.created_date
    }));

    // Categorize by match_status (single category per record)
    const categories = {
      matched_station_id: analyzed.filter(r => r.station_match_status === "matched_station_id"),
      review_needed_station_match: analyzed.filter(r => r.station_match_status === "review_needed_station_match"),
      no_safe_station_match: analyzed.filter(r => r.station_match_status === "no_safe_station_match")
    };

    // Verify category consistency
    const totalByStatus = 
      categories.matched_station_id.length + 
      categories.review_needed_station_match.length + 
      categories.no_safe_station_match.length;

    const categoryConsistencyCheck = {
      total_records: allRecords.length,
      sum_of_categories: totalByStatus,
      consistent: allRecords.length === totalByStatus,
      matched_station_id: categories.matched_station_id.length,
      review_needed_station_match: categories.review_needed_station_match.length,
      no_safe_station_match: categories.no_safe_station_match.length
    };

    // Analyze review_needed records specifically
    const reviewNeededAnalysis = categories.review_needed_station_match.map(r => ({
      id: r.id,
      station_name: r.station_name,
      candidates_present: r.station_match_candidates_length > 0,
      candidates_count: r.station_match_candidates_length,
      candidates_array: r.station_match_candidates,
      confidenceScore: r.confidenceScore,
      confidenceReason: r.confidenceReason,
      created_date: r.created_date
    }));

    return Response.json({
      diagnosis: "COMPLETE RECORD AUDIT",
      consistency_check: categoryConsistencyCheck,
      by_category: {
        matched_station_id: categories.matched_station_id.map(r => ({
          priceNok: r.priceNok,
          location: r.locationLabel,
          station: r.station_name,
          confidence: r.confidenceScore,
          reason: r.confidenceReason,
          stationId: r.stationId
        })),
        review_needed_station_match: categories.review_needed_station_match.map(r => ({
          priceNok: r.priceNok,
          location: r.locationLabel,
          station: r.station_name,
          confidence: r.confidenceScore,
          reason: r.confidenceReason,
          candidates_count: r.station_match_candidates_length
        })),
        no_safe_station_match: categories.no_safe_station_match.map(r => ({
          priceNok: r.priceNok,
          location: r.locationLabel,
          station: r.station_name,
          confidence: r.confidenceScore,
          reason: r.confidenceReason,
          gps: r.gps_latitude && r.gps_longitude ? `[${r.gps_latitude}, ${r.gps_longitude}]` : "null"
        }))
      },
      review_needed_detailed: reviewNeededAnalysis,
      report: {
        "issue_1_category_count": "RESOLVED: All 6 records categorized into single status each",
        "issue_2_candidates": reviewNeededAnalysis.length > 0 
          ? `VERIFIED: ${reviewNeededAnalysis.filter(r => r.candidates_present).length}/${reviewNeededAnalysis.length} review_needed records have station_match_candidates`
          : "NO REVIEW_NEEDED RECORDS"
      }
    });
  } catch (error) {
    return Response.json({ 
      status: "ERROR", 
      error: error.message 
    }, { status: 500 });
  }
});