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

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function normalizeAddress(addr) {
  if (!addr) return '';
  return addr.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function stringSimilarity(a, b) {
  const normA = normalizeName(a);
  const normB = normalizeName(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  return 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get grouping result
    const groupRes = await base44.functions.invoke('groupStationCandidates');
    const { groups = [] } = groupRes.data;

    // Filter for exact duplicate groups (3+ candidates with exact match)
    const exactDuplicateGroups = groups.filter(g => 
      g.candidates.length >= 3 && 
      g.reason.includes('exact_duplicate_name_address_coords')
    );

    if (exactDuplicateGroups.length === 0) {
      return Response.json({
        message: 'No exact duplicate groups to auto-approve',
        processed: 0,
        approved: 0,
        markedDuplicate: 0,
      });
    }

    let totalApproved = 0;
    let totalMarkedDuplicate = 0;
    const processedGroups = [];

    // Process each exact duplicate group
    for (const group of exactDuplicateGroups) {
      // Pick first as source of truth
      const approvedCandidate = group.candidates[0];
      const duplicateCandidates = group.candidates.slice(1);

      // Create Station from approved candidate
      const station = await base44.entities.Station.create({
        name: approvedCandidate.proposedName,
        chain: approvedCandidate.proposedChain || null,
        address: approvedCandidate.address,
        latitude: approvedCandidate.latitude,
        longitude: approvedCandidate.longitude,
        region: approvedCandidate.region,
        sourceName: approvedCandidate.sourceName,
        sourceStationId: approvedCandidate.sourceStationId,
      });

      // Update approved candidate
      await base44.entities.StationCandidate.update(approvedCandidate.id, {
        status: 'approved',
        notes: `Auto-approved. Exact duplicate of ${duplicateCandidates.length} other candidates. Station created: ${station.id}`,
      });
      totalApproved++;

      // Mark duplicates
      for (const dupCandidate of duplicateCandidates) {
        await base44.entities.StationCandidate.update(dupCandidate.id, {
          status: 'duplicate',
          notes: `Auto-marked duplicate. Exact match with approved station: ${approvedCandidate.proposedName} at ${approvedCandidate.address}`,
        });
        totalMarkedDuplicate++;
      }

      processedGroups.push({
        groupId: group.groupId,
        approvedId: approvedCandidate.id,
        approvedName: approvedCandidate.proposedName,
        stationId: station.id,
        duplicateCount: duplicateCandidates.length,
      });
    }

    return Response.json({
      message: 'Auto-approval completed',
      processed: exactDuplicateGroups.length,
      approved: totalApproved,
      markedDuplicate: totalMarkedDuplicate,
      processedGroups,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});