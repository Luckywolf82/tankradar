import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
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
      /mock/i,
      /example/i,
      /unittest/i
    ];

    const testRecords = allUserReported.filter(record => {
      const stationName = record.station_name || '';
      const confidenceReason = record.confidenceReason || '';
      const notes = record.station_match_notes || '';
      const rawPayload = record.rawPayloadSnippet || '';

      const combinedText = `${stationName} ${confidenceReason} ${notes} ${rawPayload}`.toLowerCase();
      
      return testPatterns.some(pattern => pattern.test(combinedText));
    });

    // Categorize test records
    const categorized = testRecords.map(r => ({
      id: r.id,
      station_name: r.station_name,
      priceNok: r.priceNok,
      confidenceReason: r.confidenceReason,
      station_match_notes: r.station_match_notes,
      station_match_status: r.station_match_status,
      created_date: r.created_date,
      testIndicators: {
        station_name: /^test\s/i.test(r.station_name || '') || /test:/i.test(r.station_name || ''),
        confidenceReason: /test:/i.test(r.confidenceReason || ''),
        notes: /test:/i.test(r.station_match_notes || '')
      }
    }));

    return Response.json({
      status: "AUDIT_COMPLETE",
      total_user_reported: allUserReported.length,
      test_records_found: testRecords.length,
      production_records: allUserReported.length - testRecords.length,
      test_records: categorized,
      summary: {
        action_required: testRecords.length > 0,
        recommendation: testRecords.length > 0 
          ? "Mark or remove these test records before final production deployment"
          : "No test records detected in dataset"
      }
    });
  } catch (error) {
    return Response.json({ 
      status: "ERROR", 
      error: error.message 
    }, { status: 500 });
  }
});