import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all pending candidates
    const allCandidates = await base44.entities.StationCandidate.list();
    const pendingCandidates = allCandidates.filter(c => c.status === 'pending');

    // Get groupings
    const groupRes = await base44.functions.invoke('groupStationCandidates');
    const { groups = [] } = groupRes.data;

    // Find groups with ONLY exact_duplicate reason and more than 1 candidate
    const autoApprovableGroups = groups.filter(g => 
      g.candidates.length > 1 &&
      g.reason.every(r => r === 'exact_duplicate_name_address_coords')
    );

    let approved = 0;
    let markedDuplicate = 0;
    const approvedCandidates = [];

    // For each group, approve first and mark rest as duplicate
    for (const group of autoApprovableGroups) {
      const [sourceCandidate, ...duplicates] = group.candidates;

      // Create station from source candidate
      const station = await base44.entities.Station.create({
        name: sourceCandidate.proposedName,
        chain: sourceCandidate.proposedChain,
        address: sourceCandidate.address,
        region: sourceCandidate.region,
        latitude: sourceCandidate.latitude,
        longitude: sourceCandidate.longitude,
        sourceName: sourceCandidate.sourceName,
        sourceStationId: sourceCandidate.sourceStationId,
      });

      // Approve source candidate
      await base44.entities.StationCandidate.update(sourceCandidate.id, {
        status: 'approved',
        notes: 'Auto-approved as source of exact duplicate group',
      });
      approved++;
      approvedCandidates.push(sourceCandidate.proposedName);

      // Mark duplicates
      for (const dup of duplicates) {
        await base44.entities.StationCandidate.update(dup.id, {
          status: 'duplicate',
          notes: `Exact duplicate of ${sourceCandidate.proposedName} (auto-marked)`,
        });
        markedDuplicate++;
      }
    }

    return Response.json({
      success: true,
      groupsProcessed: autoApprovableGroups.length,
      candidatesApproved: approved,
      candidatesMarkedDuplicate: markedDuplicate,
      approvedStations: approvedCandidates,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});