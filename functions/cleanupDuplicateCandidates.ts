import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { groupId, selectedCandidateId, action = 'mark_as_duplicate' } = await req.json();

    if (!groupId || !selectedCandidateId) {
      return Response.json({ 
        error: 'Missing groupId or selectedCandidateId',
        info: 'Provide groupId (anchor candidate) and selectedCandidateId (the one to keep)'
      }, { status: 400 });
    }

    // Fetch group members (identified by very close coordinates and same sourceStationId or very similar data)
    const candidates = await base44.entities.StationCandidate.filter({ status: 'pending' });
    const anchor = candidates.find(c => c.id === groupId);
    
    if (!anchor) {
      return Response.json({ error: 'Anchor candidate not found' }, { status: 404 });
    }

    const groupMembers = candidates.filter(c => {
      if (c.id === groupId) return false;
      const dist = calculateDistance(anchor.latitude, anchor.longitude, c.latitude, c.longitude);
      return dist < 0.05 && c.sourceStationId === anchor.sourceStationId;
    });

    if (groupMembers.length === 0) {
      return Response.json({
        message: 'No duplicates found to clean',
        groupId,
        removed: 0,
      });
    }

    // Action: mark_as_duplicate (non-destructive)
    if (action === 'mark_as_duplicate') {
      const results = [];
      for (const member of groupMembers) {
        await base44.entities.StationCandidate.update(member.id, {
          status: 'duplicate',
          notes: `Duplicate of ${selectedCandidateId}`,
        });
        results.push({
          id: member.id,
          name: member.proposedName,
          marked: 'duplicate',
        });
      }

      return Response.json({
        action: 'mark_as_duplicate',
        groupId,
        markedCount: results.length,
        results,
      });
    }

    // Action: delete_duplicates (destructive - requires explicit confirmation)
    if (action === 'delete_duplicates') {
      const results = [];
      for (const member of groupMembers) {
        await base44.entities.StationCandidate.delete(member.id);
        results.push({
          id: member.id,
          name: member.proposedName,
          deleted: true,
        });
      }

      return Response.json({
        action: 'delete_duplicates',
        groupId,
        deletedCount: results.length,
        results,
        warning: 'Duplicates have been permanently deleted',
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});