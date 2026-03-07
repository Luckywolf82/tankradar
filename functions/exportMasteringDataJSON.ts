import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all relevant mastering data
    const [stations, candidates, reviews] = await Promise.all([
      base44.asServiceRole.entities.Station.list(),
      base44.asServiceRole.entities.StationCandidate.list(),
      base44.asServiceRole.entities.StationReview.list()
    ]);

    const stationsWithChain = stations.filter(s => s.chain && s.chain !== 'unknown' && s.chain !== null);
    const stationsMissingChain = stations.filter(s => !s.chain || s.chain === 'unknown' || s.chain === null);
    const stationsMissingCity = stations.filter(s => !s.city);
    const stationsMissingAddress = stations.filter(s => !s.address);

    const exportData = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalStations: stations.length,
        totalCandidates: candidates.length,
        totalReviews: reviews.length,
        stationDataQuality: {
          withChain: stationsWithChain.length,
          missingChain: stationsMissingChain.length,
          missingCity: stationsMissingCity.length,
          missingAddress: stationsMissingAddress.length
        },
        candidatesByStatus: {
          pending: candidates.filter(c => c.status === 'pending').length,
          approved: candidates.filter(c => c.status === 'approved').length,
          rejected: candidates.filter(c => c.status === 'rejected').length,
          duplicate: candidates.filter(c => c.status === 'duplicate').length
        },
        reviewsByStatus: {
          pending: reviews.filter(r => r.status === 'pending').length,
          approved: reviews.filter(r => r.status === 'approved').length,
          rejected: reviews.filter(r => r.status === 'rejected').length,
          duplicate: reviews.filter(r => r.status === 'duplicate').length
        },
        reviewsByType: {
          legacy_duplicate: reviews.filter(r => r.review_type === 'legacy_duplicate').length,
          chain_unconfirmed: reviews.filter(r => r.review_type === 'chain_unconfirmed').length,
          generic_name_review: reviews.filter(r => r.review_type === 'generic_name_review').length,
          seed_conflict: reviews.filter(r => r.review_type === 'seed_conflict').length
        }
      },
      data: {
        stations: stations.map(s => ({
          id: s.id,
          name: s.name,
          chain: s.chain || 'unknown',
          address: s.address,
          city: s.city,
          region: s.region,
          postalCode: s.postalCode,
          latitude: s.latitude,
          longitude: s.longitude,
          sourceName: s.sourceName,
          sourceStationId: s.sourceStationId,
          normalizedName: s.normalizedName,
          created_date: s.created_date,
          updated_date: s.updated_date
        })),
        candidates: candidates.map(c => ({
          id: c.id,
          sourceName: c.sourceName,
          sourceStationId: c.sourceStationId,
          proposedName: c.proposedName,
          proposedChain: c.proposedChain,
          latitude: c.latitude,
          longitude: c.longitude,
          address: c.address,
          matchCandidates: c.matchCandidates,
          matchConfidence: c.matchConfidence,
          status: c.status,
          region: c.region,
          notes: c.notes,
          created_date: c.created_date,
          updated_date: c.updated_date
        })),
        reviews: reviews.map(r => ({
          id: r.id,
          stationId: r.stationId,
          review_type: r.review_type,
          station_name: r.station_name,
          station_chain: r.station_chain,
          station_latitude: r.station_latitude,
          station_longitude: r.station_longitude,
          status: r.status,
          issue_description: r.issue_description,
          suggested_action: r.suggested_action,
          notes: r.notes,
          duplicate_of_station_id: r.duplicate_of_station_id,
          source_report: r.source_report,
          created_date: r.created_date,
          updated_date: r.updated_date
        }))
      }
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    return new Response(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename=mastering-hub-export.json'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});