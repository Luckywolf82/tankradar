import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * cleanupTestArtifactsGooglePlaces
 * 
 * SLETTER test-artefakt-poster som peker til ufyldig stationId
 * Kjørbar kun av admin
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Definer test-artefakt-IDs som skal slettes
    const testArtifactIds = [
      "validate_0",
      "validate_1",
      "validate_2",
      "test_station_trace"
    ];

    const deletedPosts = [];
    let totalDeleted = 0;

    // Slett hver test-artefakt
    for (const testId of testArtifactIds) {
      // Hent alle poster med denne stationId
      const postsToDelete = await base44.entities.FuelPrice.filter(
        { stationId: testId, sourceName: "GooglePlaces" },
        "-fetchedAt",
        100
      );

      for (const post of postsToDelete) {
        deletedPosts.push({
          id: post.id,
          stationId: post.stationId,
          fuelType: post.fuelType,
          priceNok: post.priceNok,
          createdAt: post.created_date
        });

        // Slett posten
        await base44.asServiceRole.entities.FuelPrice.delete(post.id);
        totalDeleted++;
      }
    }

    // Bekreft at ingen poster igjen refererer til test-IDs
    const remainingTestReferences = [];
    for (const testId of testArtifactIds) {
      const remaining = await base44.entities.FuelPrice.filter(
        { stationId: testId, sourceName: "GooglePlaces" }
      );
      if (remaining.length > 0) {
        remainingTestReferences.push({
          testId: testId,
          stillRemaining: remaining.length
        });
      }
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      cleanup: {
        testArtifactsTargeted: testArtifactIds,
        deleted: totalDeleted,
        deletedPosts: deletedPosts,
        remainingTestReferences: remainingTestReferences.length > 0
          ? remainingTestReferences
          : "✓ Ingen test-referanser gjenstår",
        status: remainingTestReferences.length === 0
          ? "✓ Opprydding fullført – alle test-artefakter slettet"
          : "⚠ Noen test-poster ble ikke slettet"
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});