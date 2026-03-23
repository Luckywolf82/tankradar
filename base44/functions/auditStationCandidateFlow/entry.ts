import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all candidates
    const allCandidates = await base44.entities.StationCandidate.list('-updated_date', 500);

    // Group by status
    const byStatus = {};
    allCandidates.forEach(c => {
      if (!byStatus[c.status]) byStatus[c.status] = [];
      byStatus[c.status].push(c);
    });

    // Check if approved candidates have corresponding Stations
    const approvedCandidates = byStatus.approved || [];
    const stationsFromApprovedCandidates = [];

    for (const candidate of approvedCandidates) {
      const station = await base44.entities.Station.filter(
        { sourceStationId: candidate.sourceStationId }
      );
      if (station.length > 0) {
        stationsFromApprovedCandidates.push({
          candidateId: candidate.id,
          candidateName: candidate.proposedName,
          stationId: station[0].id,
          stationName: station[0].name
        });
      }
    }

    return Response.json({
      report: 'Station Candidate Flow Audit',
      totalCandidates: allCandidates.length,
      byStatus,
      approvedCandidatesWithCorrespondingStations: stationsFromApprovedCandidates.length,
      examples: stationsFromApprovedCandidates.slice(0, 5),
      findings: [
        'StationCandidate.status should control if something becomes a Station',
        'Only "approved" candidates should be converted to Stations',
        'If all candidates have become Stations, check if auto-approval is happening'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});