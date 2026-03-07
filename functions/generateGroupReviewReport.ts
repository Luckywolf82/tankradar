import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all candidates and calculate stats
    const allCandidates = await base44.entities.StationCandidate.list();
    
    // Count by status
    const byStatus = {
      pending: 0,
      approved: 0,
      rejected: 0,
      duplicate: 0,
    };
    
    allCandidates.forEach(c => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    });

    // Group analysis
    const groupRes = await base44.functions.invoke('groupStationCandidates');
    const { groups = [], ungrouped = [] } = groupRes.data;

    // Count candidates in groups
    const groupedCount = groups.reduce((sum, g) => sum + g.candidates.length, 0);

    // Analyze what would happen if groups were approved
    const projections = {
      groupsIfApproved: groups.length, // Each group = 1 Station
      duplicatesIfApproved: groupedCount - groups.length, // Rest marked duplicate
      individualStations: ungrouped.length,
    };

    // Calculate consistency check
    const totalGroupedCandidates = groups.reduce((sum, g) => sum + g.candidates.length, 0);
    
    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      summary: {
        totalCandidates: allCandidates.length,
        byStatus,
        groupedCount,
        ungroupedCount: ungrouped.length,
      },
      groupsData: {
        totalGroups: groups.length,
        duplicateGroups: groups.filter(g => g.groupType === 'duplicate').length,
        sameLocationGroups: groups.filter(g => g.groupType === 'same_location').length,
      },
      projections,
      consistency: {
        totalCandidatesInGroups: totalGroupedCandidates,
        candidatesUngrouped: ungrouped.length,
        totalCandidatesChecksum: totalGroupedCandidates + ungrouped.length,
        allCandidatesCount: allCandidates.length,
        isConsistent: (totalGroupedCandidates + ungrouped.length) === allCandidates.length,
      },
      notes: {
        whatHappensWhenGroupApproved: 'When a group is approved: 1 candidate → approved + Station created, others in group → marked duplicate',
        whySplitExists: 'Some groups may contain different physical stations (e.g., Uno-X Østre Rosten and St1 Tiller 300m apart). Split feature allows manual separation.',
        topTallConsistency: 'After group approval, all group members get final status. Top tallies reflect database status, not just UI-visibility.',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});