import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { stationIds } = await req.json();

    if (!stationIds || stationIds.length === 0) {
      return Response.json({ error: 'No station IDs provided' }, { status: 400 });
    }

    const results = {
      totalStations: stationIds.length,
      pricesFetched: 0,
      pricesFailed: 0,
      pricesCreated: [],
      errors: [],
      report: [],
    };

    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!googleApiKey) {
      return Response.json(
        { error: 'GOOGLE_PLACES_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch each station and get GP prices
    for (const stationId of stationIds) {
      const station = await base44.asServiceRole.entities.Station.get(stationId);
      
      if (!station || !station.latitude || !station.longitude) {
        results.pricesFailed++;
        results.report.push({
          stationId,
          status: 'error',
          message: 'Station not found or missing coordinates',
        });
        continue;
      }

      try {
        // Call Google Places Nearby Search
        const query = `${station.name} fuel station`;
        const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
        searchUrl.searchParams.set('location', `${station.latitude},${station.longitude}`);
        searchUrl.searchParams.set('radius', '100');
        searchUrl.searchParams.set('keyword', query);
        searchUrl.searchParams.set('key', googleApiKey);

        const gpResponse = await fetch(searchUrl.toString());
        const gpData = await gpResponse.json();

        if (!gpData.results || gpData.results.length === 0) {
          results.pricesFailed++;
          results.report.push({
            stationId,
            stationName: station.name,
            status: 'no_match',
            message: 'No Google Places result found',
          });
          continue;
        }

        const gpPlace = gpData.results[0];
        const updateTime = gpPlace.opening_hours?.periods ? new Date().toISOString() : null;

        // Parse price from business_status or other fields if available
        // For now, we're primarily logging what we found
        // Actual price extraction would happen in separate parser logic

        results.pricesFetched++;
        results.report.push({
          stationId,
          stationName: station.name,
          gpPlaceName: gpPlace.name,
          gpPlaceId: gpPlace.place_id,
          status: 'fetched',
          hasOpeningHours: !!gpPlace.opening_hours,
          updateTime,
        });

        // Create FuelPrice record if we can extract pricing
        // This is a placeholder - actual price extraction depends on GP response structure
        const fuelPriceRecord = {
          stationId,
          locationLabel: station.city || 'Unknown',
          fuelType: 'unknown',
          priceNok: null,
          priceType: 'station_level',
          sourceName: 'GooglePlaces',
          sourceUrl: `https://maps.google.com/maps?q=place_id:${gpPlace.place_id}`,
          sourceUpdatedAt: updateTime,
          fetchedAt: new Date().toISOString(),
          sourceFrequency: 'near_realtime',
          confidenceScore: 0.5,
          confidenceReason: 'GP data fetched but price parsing not yet implemented',
          parserVersion: '1.0',
          plausibilityStatus: null,
          rawPayloadSnippet: JSON.stringify({
            gpPlaceName: gpPlace.name,
            gpPlaceId: gpPlace.place_id,
            formattedAddress: gpPlace.vicinity,
          }),
          station_match_status: 'matched_station_id',
          station_name: station.name,
          station_chain: station.chain || null,
        };

        await base44.asServiceRole.entities.FuelPrice.create(fuelPriceRecord);
        results.pricesCreated.push(fuelPriceRecord);

      } catch (error) {
        results.pricesFailed++;
        results.errors.push({
          stationId,
          stationName: station.name,
          error: error.message,
        });
        results.report.push({
          stationId,
          stationName: station.name,
          status: 'error',
          message: error.message,
        });
      }
    }

    return Response.json({
      success: true,
      summary: {
        total: results.totalStations,
        fetched: results.pricesFetched,
        failed: results.pricesFailed,
        pricesCreated: results.pricesCreated.length,
      },
      report: results.report,
      errors: results.errors.length > 0 ? results.errors : null,
    });

  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});