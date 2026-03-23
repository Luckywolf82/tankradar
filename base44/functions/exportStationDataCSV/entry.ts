import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all stations
    const stations = await base44.asServiceRole.entities.Station.list();

    // Build CSV
    const headers = ['id', 'name', 'chain', 'address', 'city', 'region', 'postalCode', 'latitude', 'longitude', 'sourceName', 'sourceStationId', 'created_date', 'updated_date'];
    
    const rows = stations.map(s => [
      s.id,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${(s.chain || '').replace(/"/g, '""')}"`,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      `"${(s.city || '').replace(/"/g, '""')}"`,
      `"${(s.region || '').replace(/"/g, '""')}"`,
      `"${(s.postalCode || '').replace(/"/g, '""')}"`,
      s.latitude,
      s.longitude,
      s.sourceName,
      s.sourceStationId,
      s.created_date,
      s.updated_date,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="stations_${new Date().toISOString().split('T')[0]}.csv"`,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});