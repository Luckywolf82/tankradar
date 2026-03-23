import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all legacy user_reported records
    const allRecords = await base44.entities.FuelPrice.filter({ 
      priceType: "user_reported" 
    });

    const legacyRecords = allRecords.filter(r => 
      r.confidenceScore === 1.0 && 
      !r.confidenceReason
    );

    const results = {
      total_processed: 0,
      total_backfilled: 0,
      by_status: {
        matched_station_id: { processed: 0, backfilled: 0 },
        review_needed_station_match: { processed: 0, backfilled: 0 },
        no_safe_station_match: { processed: 0, backfilled: 0 }
      },
      operations: []
    };

    // Process each legacy record
    for (const record of legacyRecords) {
      const status = record.station_match_status || 'unknown';
      results.by_status[status] = results.by_status[status] || { processed: 0, backfilled: 0 };
      results.by_status[status].processed++;
      results.total_processed++;

      let updateData = {
        confidenceReason: "legacy_backfill"
      };

      // Infer confidence score based on match status
      if (status === 'matched_station_id') {
        updateData.confidenceScore = 0.85;
        updateData.confidenceReason = "legacy_backfill: station_id_matched";
      } else if (status === 'review_needed_station_match') {
        updateData.confidenceScore = 0.50;
        updateData.confidenceReason = "legacy_backfill: review_needed_candidates";
      } else if (status === 'no_safe_station_match') {
        updateData.confidenceScore = 0.30;
        updateData.confidenceReason = "legacy_backfill: no_safe_match + station_metadata";
      }

      // Perform update
      await base44.entities.FuelPrice.update(record.id, updateData);
      results.by_status[status].backfilled++;
      results.total_backfilled++;

      results.operations.push({
        id: record.id,
        priceNok: record.priceNok,
        status: status,
        new_confidenceScore: updateData.confidenceScore,
        new_confidenceReason: updateData.confidenceReason
      });
    }

    results.summary = `Successfully backfilled ${results.total_backfilled} legacy records. All user_reported records now conform to new production model.`;

    return Response.json(results);
  } catch (error) {
    return Response.json({ 
      status: "ERROR", 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});