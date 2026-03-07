import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function escapeCsvField(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const stations = await base44.entities.Station.list();

    // CSV Header
    const headers = [
      'ID',
      'Navn',
      'Kjede',
      'Adresse',
      'By',
      'Postnummer',
      'Region',
      'Breddegrad',
      'Lengdegrad',
      'Kilde',
      'Kilde ID',
      'Importert',
      'Opprettet',
    ];

    // CSV Rows
    const rows = stations.map(s => [
      escapeCsvField(s.id),
      escapeCsvField(s.name),
      escapeCsvField(s.chain),
      escapeCsvField(s.address),
      escapeCsvField(s.city),
      escapeCsvField(s.postalCode),
      escapeCsvField(s.region),
      escapeCsvField(s.latitude),
      escapeCsvField(s.longitude),
      escapeCsvField(s.sourceName),
      escapeCsvField(s.sourceStationId),
      escapeCsvField(new Date(s.created_date).toISOString().split('T')[0]),
      escapeCsvField(new Date(s.created_date).toLocaleString('nb-NO')),
    ]);

    // Build CSV
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const filename = `Station_Data_${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});