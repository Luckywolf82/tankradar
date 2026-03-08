import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Samme mønstre som regelmotoren
const FOREIGN_PATTERNS = [
  /\bpreem\b/i,
  /\bokq8\b/i,
  /\benonteki/i,
  /\bk-market\b/i, /\bk market\b/i,
  /\bst1 se\b/i,
  /\bq8\b/i,
  /\bteboil\b/i,
  /\bmacken\b/i,
  /\btännäs\b/i,
  /\bsälen\b/i,
  /åre\b/i,
  /klimpfjäll/i,
  /ljungdalen/i,
  /\bjokkmokk\b/i,
  /\bkilpisjärvi\b/i,
  /\brajamarket\b/i,
  /\btärna vilt\b/i,
  /\bboxfjäll\b/i,
  /\bsirbmá\b/i,
];

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

const isForeign = (name) => {
  const n = norm(name);
  return FOREIGN_PATTERNS.some(p => p.test(n));
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // default: dryRun=true for sikkerhet

    // Hent alle stasjoner
    let allStations = [];
    let page = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Station.list('-created_date', 500, page * 500);
      if (!batch || batch.length === 0) break;
      allStations = allStations.concat(batch);
      if (batch.length < 500) break;
      page++;
    }

    const foreignStations = allStations.filter(s => isForeign(s.name));

    if (dryRun) {
      return Response.json({
        dryRun: true,
        count: foreignStations.length,
        stations: foreignStations.map(s => ({ id: s.id, name: s.name, sourceName: s.sourceName })),
      });
    }

    // Slett stations
    let deletedStations = 0;
    let deletedReviews = 0;
    const foreignIds = new Set(foreignStations.map(s => s.id));

    for (const station of foreignStations) {
      try {
        await base44.asServiceRole.entities.Station.delete(station.id);
        deletedStations++;
      } catch (e) { /* ignorer enkeltfeil */ }
      await new Promise(r => setTimeout(r, 30));
    }

    // Slett tilhørende StationReview-records
    const allReviews = await base44.asServiceRole.entities.StationReview.list();
    const reviewsToDelete = allReviews.filter(r => foreignIds.has(r.stationId) || r.review_type === 'possible_foreign_station');

    for (const review of reviewsToDelete) {
      try {
        await base44.asServiceRole.entities.StationReview.delete(review.id);
        deletedReviews++;
      } catch (e) { /* ignorer enkeltfeil */ }
      await new Promise(r => setTimeout(r, 20));
    }

    console.log(`[deleteForeignStations] Slettet ${deletedStations} stasjoner og ${deletedReviews} reviews`);

    return Response.json({
      success: true,
      deletedStations,
      deletedReviews,
      names: foreignStations.map(s => s.name),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});