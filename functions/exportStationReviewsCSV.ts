import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all station reviews
    const reviews = await base44.asServiceRole.entities.StationReview.list();

    // Build CSV
    const headers = ['review_id', 'review_type', 'stationId', 'station_name', 'chain', 'address', 'city', 'latitude', 'longitude', 'issue_description', 'suggested_action', 'status', 'source_report', 'created_date', 'updated_date'];
    
    const rows = reviews.map(r => [
      r.id,
      r.review_type,
      r.stationId,
      `"${(r.station_name || '').replace(/"/g, '""')}"`,
      `"${(r.station_chain || '').replace(/"/g, '""')}"`,
      `"${(r.station_latitude || '').toString()}"`,
      `"${(r.station_longitude || '').toString()}"`,
      r.station_latitude,
      r.station_longitude,
      `"${(r.issue_description || '').replace(/"/g, '""')}"`,
      `"${(r.suggested_action || '').replace(/"/g, '""')}"`,
      r.status,
      r.source_report || '',
      r.created_date,
      r.updated_date,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="station_reviews_${new Date().toISOString().split('T')[0]}.csv"`,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});