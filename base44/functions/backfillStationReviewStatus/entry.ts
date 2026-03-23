import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all stations without reviewStatus
    const allStations = await base44.entities.Station.list('-updated_date', 1000);
    
    const stationsToUpdate = allStations.filter(s => !s.reviewStatus);

    if (stationsToUpdate.length === 0) {
      return Response.json({ 
        message: 'All stations already have reviewStatus set',
        checked: allStations.length,
        updated: 0
      });
    }

    // Update each station with reviewStatus = "pending"
    for (const station of stationsToUpdate) {
      await base44.entities.Station.update(station.id, {
        reviewStatus: 'pending'
      });
    }

    return Response.json({
      message: 'Backfill completed',
      checked: allStations.length,
      updated: stationsToUpdate.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});