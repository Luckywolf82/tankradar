import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all user_reported records
    const allUserReported = await base44.entities.FuelPrice.filter({
      priceType: "user_reported"
    });

    // Patterns that indicate test data
    const testPatterns = [
      /^test\s/i,
      /test:/i,
      /fixture/i,
      /mock/i
    ];

    const testRecordIds = allUserReported
      .filter(record => {
        const stationName = record.station_name || '';
        const confidenceReason = record.confidenceReason || '';
        const notes = record.station_match_notes || '';

        const combinedText = `${stationName} ${confidenceReason} ${notes}`.toLowerCase();
        return testPatterns.some(pattern => pattern.test(combinedText));
      })
      .map(r => r.id);

    // Delete test records
    let deleted = 0;
    for (const recordId of testRecordIds) {
      await base44.entities.FuelPrice.delete(recordId);
      deleted++;
    }

    return Response.json({
      status: "CLEANUP_COMPLETE",
      deleted_count: deleted,
      deleted_records: testRecordIds,
      remaining_user_reported: allUserReported.length - deleted,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ 
      status: "ERROR", 
      error: error.message 
    }, { status: 500 });
  }
});