import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Resets reviewStatus from 'flagged' to 'pending' for all stations that have fetchScopeStatus='out_of_scope'.
// These were incorrectly flagged before fetchScopeStatus existed as a concept.
// Does NOT touch fetchScopeStatus — out_of_scope is preserved.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all stations with reviewStatus=flagged AND fetchScopeStatus=out_of_scope
  const stations = await base44.asServiceRole.entities.Station.filter({
    reviewStatus: 'flagged',
    fetchScopeStatus: 'out_of_scope',
  }, '-created_date', 500);

  let updated = 0;
  for (const s of stations) {
    await base44.asServiceRole.entities.Station.update(s.id, { reviewStatus: 'pending' });
    updated++;
  }

  return Response.json({
    message: `Done. Reset reviewStatus to 'pending' for ${updated} stations.`,
    updated,
  });
});