import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all user_reported records
    const allRecords = await base44.entities.FuelPrice.filter({ 
      priceType: "user_reported" 
    });

    // Categorize records
    const categories = {
      new_model_complete: [],      // Has all new fields correctly
      legacy_old_format: [],       // confidenceScore = 1.0, missing fields
      partial_migration: [],       // Some new fields but incomplete
      corrupted: []                // Data integrity issues
    };

    allRecords.forEach(record => {
      const hasConfidenceReason = record.confidenceReason && record.confidenceReason.trim().length > 0;
      const hasGpsLat = record.gps_latitude !== null && record.gps_latitude !== undefined;
      const hasGpsLon = record.gps_longitude !== null && record.gps_longitude !== undefined;
      const hasCorrectConfidenceScore = [0.30, 0.50, 0.85].includes(record.confidenceScore);

      // New model: all fields present and score is dynamic
      if (hasConfidenceReason && hasGpsLat && hasGpsLon && hasCorrectConfidenceScore) {
        categories.new_model_complete.push({
          id: record.id,
          created_date: record.created_date,
          priceNok: record.priceNok,
          confidenceScore: record.confidenceScore,
          locationLabel: record.locationLabel
        });
      }
      // Legacy: hardcoded 1.0, missing new fields
      else if (record.confidenceScore === 1.0 && !hasConfidenceReason && !hasGpsLat && !hasGpsLon) {
        categories.legacy_old_format.push({
          id: record.id,
          created_date: record.created_date,
          priceNok: record.priceNok,
          station_match_status: record.station_match_status,
          locationLabel: record.locationLabel,
          station_name: record.station_name,
          station_chain: record.station_chain,
          hasConfidenceReason,
          hasGpsLat,
          hasGpsLon
        });
      }
      // Partial: some fields but not all
      else if (record.confidenceScore === 1.0 || !hasConfidenceReason || !hasGpsLat || !hasGpsLon) {
        categories.partial_migration.push({
          id: record.id,
          created_date: record.created_date,
          priceNok: record.priceNok,
          confidenceScore: record.confidenceScore,
          hasConfidenceReason,
          hasGpsLat,
          hasGpsLon,
          station_match_status: record.station_match_status
        });
      }
      // Data issue
      else {
        categories.corrupted.push({
          id: record.id,
          issue: 'Unexpected state'
        });
      }
    });

    // Analyze match statuses in legacy records
    const legacyByMatchStatus = {
      matched_station_id: categories.legacy_old_format.filter(r => r.station_match_status === 'matched_station_id'),
      review_needed_station_match: categories.legacy_old_format.filter(r => r.station_match_status === 'review_needed_station_match'),
      no_safe_station_match: categories.legacy_old_format.filter(r => r.station_match_status === 'no_safe_station_match')
    };

    return Response.json({
      analysis_date: new Date().toISOString(),
      total_user_reported_records: allRecords.length,
      summary: {
        new_model_complete: categories.new_model_complete.length,
        legacy_old_format: categories.legacy_old_format.length,
        partial_migration: categories.partial_migration.length,
        corrupted: categories.corrupted.length
      },
      legacy_by_match_status: {
        matched_station_id: legacyByMatchStatus.matched_station_id.length,
        review_needed_station_match: legacyByMatchStatus.review_needed_station_match.length,
        no_safe_station_match: legacyByMatchStatus.no_safe_station_match.length
      },
      migration_strategy: {
        new_model_complete: {
          action: "KEEP_UNCHANGED",
          reason: "Already in new format with all required fields",
          count: categories.new_model_complete.length
        },
        matched_station_id_legacy: {
          action: "BACKFILL_CANDIDATE",
          reason: "Has stationId - can infer confidenceScore=0.85 and confidenceReason",
          count: legacyByMatchStatus.matched_station_id.length,
          strategy: "Run backfill with score 0.85, reason 'legacy_backfill: station_id_matched'"
        },
        review_needed_legacy: {
          action: "BACKFILL_CANDIDATE",
          reason: "Has match_candidates - can infer confidenceScore=0.50 and confidenceReason",
          count: legacyByMatchStatus.review_needed_station_match.length,
          strategy: "Run backfill with score 0.50, reason 'legacy_backfill: review_needed_candidates'"
        },
        no_safe_match_legacy: {
          action: "MARK_LEGACY_OR_BACKFILL",
          reason: "Can only receive GPS from initial scan - check if station_name/chain present",
          count: legacyByMatchStatus.no_safe_station_match.length,
          strategy: "If station_name present: backfill with score 0.30 + reason. If missing: mark legacy"
        },
        partial_records: {
          action: "AUDIT_INDIVIDUALLY",
          reason: "Inconsistent state - review each case",
          count: categories.partial_migration.length
        },
        corrupted: {
          action: "QUARANTINE",
          reason: "Data integrity issue",
          count: categories.corrupted.length
        }
      },
      legacy_sample: categories.legacy_old_format.slice(0, 3),
      new_model_sample: categories.new_model_complete.slice(0, 3),
      next_steps: [
        "1. Approve migration strategy above",
        "2. Run backfill_legacy_user_reported_scores function",
        "3. Verify all records now meet new model requirements",
        "4. Update documentation to reflect new_model as production standard"
      ]
    });
  } catch (error) {
    return Response.json({ 
      status: "ERROR", 
      error: error.message 
    }, { status: 500 });
  }
});