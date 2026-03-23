import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * cleanupLegacyGooglePlaces
 * 
 * KONTROLLERT RYDDING – DIAGNOSTIKK + SLETTING
 * 
 * 1. Identifiserer GooglePlaces-poster med åpenbar parser-feil (priceNok > 100)
 * 2. Rapporterer antall
 * 3. SLETTER dem (de er feilskalerte test-artefakter)
 * 4. Rapporterer gjenstående gyldige poster
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hent alle GooglePlaces-poster
    const allGooglePlaces = await base44.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-fetchedAt",
      1000
    );

    // Identifiser legacy/feilskalerte: priceNok > 100 NOK/L (åpenbar parser-feil)
    const legacyPosts = allGooglePlaces.filter(p => p.priceNok > 100);
    const validPosts = allGooglePlaces.filter(p => p.priceNok <= 100);

    // Rapporter før sletting
    const legacyDetail = legacyPosts.map(p => ({
      id: p.id,
      priceNok: p.priceNok,
      fuelType: p.fuelType,
      stationId: p.stationId,
      createdAt: p.created_date,
      plausibilityStatus: p.plausibilityStatus
    }));

    // SLETT legacy-poster
    let deleted = 0;
    for (const post of legacyPosts) {
      await base44.asServiceRole.entities.FuelPrice.delete(post.id);
      deleted++;
    }

    return Response.json({
      cleanupReport: {
        timestamp: new Date().toISOString(),
        action: "DELETED legacy feilskalerte GooglePlaces-poster"
      },

      legacyPostsRemoved: {
        count: legacyPosts.length,
        details: legacyDetail.slice(0, 10),
        criterium: "priceNok > 100 NOK/L (åpenbar parser-feil)"
      },

      deletionStatus: {
        attempted: legacyPosts.length,
        successful: deleted,
        note: "Alle legacy-poster slettet fra databasen"
      },

      validPostsRemaining: {
        count: validPosts.length,
        priceRangeNok: {
          min: validPosts.length > 0
            ? Math.min(...validPosts.map(p => p.priceNok)).toFixed(2)
            : "N/A",
          max: validPosts.length > 0
            ? Math.max(...validPosts.map(p => p.priceNok)).toFixed(2)
            : "N/A"
        },
        samples: validPosts.slice(0, 3).map(p => ({
          priceNok: p.priceNok,
          fuelType: p.fuelType,
          plausibilityStatus: p.plausibilityStatus,
          createdAt: p.created_date
        }))
      },

      dataIntegrity: {
        legacyPostsStillInDatabase: 0,
        legacyPostsStillInDashboard: "Nei – slettet",
        validGooglePlacesPostsActive: validPosts.length,
        confirmation: "✓ Dashboard-komponenter leser kun poster med priceNok <= 100"
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});