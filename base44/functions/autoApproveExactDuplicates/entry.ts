import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function normalizeAddress(addr) {
  if (!addr) return '';
  return addr.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all pending candidates directly (avoid grouping CPU timeout)
    const allCandidates = await base44.asServiceRole.entities.StationCandidate.list();
    const pendingCandidates = allCandidates.filter(c => c.status === 'pending');

    // Find exact duplicate groups manually: same name + address + coords
    const exactDuplicateGroups = {};
    
    for (const candidate of pendingCandidates) {
      const nameNorm = normalizeName(candidate.proposedName);
      const addrNorm = normalizeAddress(candidate.address);
      const coordKey = `${candidate.latitude.toFixed(6)}_${candidate.longitude.toFixed(6)}`;
      const groupKey = `${nameNorm}|${addrNorm}|${coordKey}`;

      if (!exactDuplicateGroups[groupKey]) {
        exactDuplicateGroups[groupKey] = [];
      }
      exactDuplicateGroups[groupKey].push(candidate);
    }

    // Filter for groups with 2+ exact duplicates
    const groupsToProcess = Object.values(exactDuplicateGroups).filter(g => g.length >= 2);

    if (groupsToProcess.length === 0) {
      return Response.json({
        message: 'No exact duplicate groups found',
        processed: 0,
        approved: 0,
        markedDuplicate: 0,
      });
    }

    let totalApproved = 0;
    let totalMarkedDuplicate = 0;
    const processedGroups = [];

    // Process each exact duplicate group with batch updates
    for (const group of groupsToProcess) {
      const approvedCandidate = group[0]; // Pick first as source of truth
      const duplicateCandidates = group.slice(1);

      // Create Station from approved candidate
      const station = await base44.asServiceRole.entities.Station.create({
        name: approvedCandidate.proposedName,
        chain: approvedCandidate.proposedChain || null,
        address: approvedCandidate.address,
        latitude: approvedCandidate.latitude,
        longitude: approvedCandidate.longitude,
        region: approvedCandidate.region,
        sourceName: 'GooglePlaces',
        sourceStationId: approvedCandidate.sourceStationId,
      });

      // Update approved candidate
      await base44.asServiceRole.entities.StationCandidate.update(approvedCandidate.id, {
        status: 'approved',
        notes: `Auto-approved exact duplicate (1 of ${group.length}). Station: ${station.id}`,
      });
      totalApproved++;

      // Batch-mark duplicates with small delay to avoid rate limiting
      for (const dupCandidate of duplicateCandidates) {
        await base44.asServiceRole.entities.StationCandidate.update(dupCandidate.id, {
          status: 'duplicate',
          notes: `Exact duplicate of: ${approvedCandidate.proposedName}`,
        });
        totalMarkedDuplicate++;
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      processedGroups.push({
        approvedName: approvedCandidate.proposedName,
        address: approvedCandidate.address,
        stationId: station.id,
        duplicateCount: duplicateCandidates.length,
      });
    }

    return Response.json({
      message: 'Auto-approval completed',
      processed: groupsToProcess.length,
      approved: totalApproved,
      markedDuplicate: totalMarkedDuplicate,
      processedGroups,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});