import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      legacy_duplicates: 0,
      chain_unconfirmed: 0,
      generic_names: 0,
      seed_conflicts: 0,
      total_created: 0,
      skipped_existing: 0,
      timestamp: new Date().toISOString(),
    };

    // Fetch all stations
    const stations = await base44.asServiceRole.entities.Station.list();
    
    // Fetch existing reviews to avoid duplicates
    const existingReviews = await base44.asServiceRole.entities.StationReview.list();
    const reviewMap = new Map();
    existingReviews.forEach(r => {
      const key = `${r.stationId}_${r.review_type}`;
      reviewMap.set(key, r);
    });

    // Define generic name patterns
    const genericPatterns = [
      /^benzinst/i, /^bensinstasjon/i, /^diesel/i, /^station/i, 
      /^fuelpoint/i, /^fuel\s+/i, /^tank/i, /^gas\s+/i,
      /^unknown/i, /^unnamed/i, /^other/i
    ];

    const isGenericName = (name) => genericPatterns.some(p => p.test(name));

    for (const station of stations) {
      // Skip stations from GooglePlaces (already have candidates)
      if (station.sourceName === 'GooglePlaces') continue;

      // 1. Chain unconfirmed (seeded from OSM/import but no chain)
      if (!station.chain && station.sourceName !== 'GooglePlaces') {
        const key = `${station.id}_chain_unconfirmed`;
        if (!reviewMap.has(key)) {
          try {
            await base44.asServiceRole.entities.StationReview.create({
              stationId: station.id,
              review_type: 'chain_unconfirmed',
              station_name: station.name,
              station_chain: null,
              station_latitude: station.latitude,
              station_longitude: station.longitude,
              status: 'pending',
              issue_description: `Kjede er ikke bekreftet. Stasjon: ${station.name} på ${station.address || 'ukjent adresse'}`,
              suggested_action: 'Verifiser kjede basert på navn og lokalisering, eller marker som unknown',
              source_report: 'seed_import_missing_chain',
            });
            results.chain_unconfirmed++;
            results.total_created++;
          } catch (err) {
            console.error(`Failed to create chain review for ${station.id}:`, err.message);
          }
        } else {
          results.skipped_existing++;
        }
      }

      // 2. Generic name review
      if (isGenericName(station.name)) {
        const key = `${station.id}_generic_name_review`;
        if (!reviewMap.has(key)) {
          try {
            await base44.asServiceRole.entities.StationReview.create({
              stationId: station.id,
              review_type: 'generic_name_review',
              station_name: station.name,
              station_chain: station.chain || null,
              station_latitude: station.latitude,
              station_longitude: station.longitude,
              status: 'pending',
              issue_description: `Navn er generisk eller ufullstendig: "${station.name}"`,
              suggested_action: 'Finn riktig navn eller merge med mer spesifikk stasjon hvis duplikat',
              source_report: 'generic_name_detection',
            });
            results.generic_names++;
            results.total_created++;
          } catch (err) {
            console.error(`Failed to create generic name review for ${station.id}:`, err.message);
          }
        } else {
          results.skipped_existing++;
        }
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});