import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * BACKFILL ASSESSMENT
 * 
 * Evaluerer hvor mange eksisterende poster som kan reddes og hvor mange som er irreparable
 */

function classifyPricePlausibility(priceNok) {
  if (!priceNok) return null;
  if (priceNok < 10) return "suspect_price_low";
  if (priceNok > 30) return "suspect_price_high";
  return "realistic_price";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allPrices = await base44.entities.FuelPrice.list('-fetchedAt', 1000);
    
    if (!allPrices || allPrices.length === 0) {
      return Response.json({ total: 0, message: "No FuelPrice records found" });
    }

    const total = allPrices.length;

    // ========== BACKFILL 1: sourceName ==========
    const unknownSourcePrices = allPrices.filter(p => !p.sourceName || p.sourceName === 'unknown');
    const unknownSourceByType = {};
    const userReportedCandidates = [];

    unknownSourcePrices.forEach(p => {
      const type = p.priceType || 'unknown';
      if (!unknownSourceByType[type]) {
        unknownSourceByType[type] = 0;
      }
      unknownSourceByType[type]++;

      // user_reported kan identifiseres ved: no stationId + no sourceUpdatedAt + simple prices
      if (!p.stationId) {
        userReportedCandidates.push({
          id: p.id,
          priceNok: p.priceNok,
          priceType: p.priceType,
          created: p.created_date
        });
      }
    });

    // ========== BACKFILL 2: plausibilityStatus ==========
    const unknownPlausibilityPrices = allPrices.filter(p => !p.plausibilityStatus || p.plausibilityStatus === 'unknown');
    const classifiableCount = unknownPlausibilityPrices.filter(p => classifyPricePlausibility(p.priceNok) !== null).length;
    const unclassifiableCount = unknownPlausibilityPrices.filter(p => classifyPricePlausibility(p.priceNok) === null).length;

    const plausibilityDistribution = {};
    unknownPlausibilityPrices.forEach(p => {
      const newStatus = classifyPricePlausibility(p.priceNok);
      if (!plausibilityDistribution[newStatus]) {
        plausibilityDistribution[newStatus] = 0;
      }
      plausibilityDistribution[newStatus]++;
    });

    // ========== BACKFILL 3: locationLabel ==========
    const noLocationPrices = allPrices.filter(p => !p.locationLabel || p.locationLabel === 'no_location');
    const withStationId = noLocationPrices.filter(p => p.stationId).length;
    const withoutStationId = noLocationPrices.filter(p => !p.stationId).length;

    const stationIdSample = [];
    noLocationPrices
      .filter(p => p.stationId)
      .slice(0, 5)
      .forEach(p => {
        stationIdSample.push({
          id: p.id,
          stationId: p.stationId,
          source: p.sourceName,
          price: p.priceNok
        });
      });

    // ========== IRREPARABLE ASSESSMENT ==========
    const irreparableCandidates = allPrices.filter(p => {
      const noPrice = !p.priceNok || p.priceNok <= 0;
      const noSource = !p.sourceName;
      const noLocation = !p.locationLabel || p.locationLabel === 'no_location';
      const noPlausibility = !p.plausibilityStatus;
      
      // Hvis pris er broken, blir dette irreparabelT
      return noPrice;
    });

    const weakRecords = allPrices.filter(p => {
      const hasPrice = p.priceNok && p.priceNok > 0;
      const noSource = !p.sourceName || p.sourceName === 'unknown';
      const noLocation = !p.locationLabel || p.locationLabel === 'no_location';
      const noPlausibility = !p.plausibilityStatus || p.plausibilityStatus === 'unknown';
      const noStationId = !p.stationId;
      
      // Weak: har pris men ingen andre metadata OG ingen stationId
      return hasPrice && noSource && noLocation && noPlausibility && noStationId;
    });

    // ========== SUMMARY ==========
    const report = {
      timestamp: new Date().toISOString(),
      total,

      backfill_sourceName: {
        title: "Hvor mange kan få sourceName?",
        unknownCount: unknownSourcePrices.length,
        unknownPercentage: ((unknownSourcePrices.length / total) * 100).toFixed(1),
        byPriceType: unknownSourceByType,
        identifyableAsUserReported: userReportedCandidates.length,
        note: "user_reported dapat identificeres ved: no stationId + no sourceUpdatedAt",
        samples: userReportedCandidates.slice(0, 3)
      },

      backfill_plausibilityStatus: {
        title: "Hvor mange kan klassifiseres retroaktivt?",
        unknownCount: unknownPlausibilityPrices.length,
        unknownPercentage: ((unknownPlausibilityPrices.length / total) * 100).toFixed(1),
        classifiableCount: classifiableCount,
        classifiablePercentage: ((classifiableCount / unknownPlausibilityPrices.length) * 100).toFixed(1),
        unclassifiableCount: unclassifiableCount,
        wouldBecomeDist: plausibilityDistribution,
        method: "classifyPricePlausibility(priceNok): <10=low, 10-30=realistic, >30=high"
      },

      backfill_locationLabel: {
        title: "Hvor mange kan få locationLabel fra eksisterende data?",
        noLocationCount: noLocationPrices.length,
        noLocationPercentage: ((noLocationPrices.length / total) * 100).toFixed(1),
        canLookupFromStationId: withStationId,
        cannotLookup: withoutStationId,
        lookupMethod: "Slå opp Station.city ved hjelp av stationId",
        stationIdExamples: stationIdSample
      },

      irreparable_assessment: {
        title: "Hvilke poster bør slettes?",
        brokenPrices: {
          count: irreparableCandidates.length,
          description: "Poster med priceNok <= 0 eller null",
          reason: "Kan ikke klassifiseres eller brukes",
          recommendation: "DELETE"
        },
        weakRecords: {
          count: weakRecords.length,
          description: "Poster med: har priceNok MEN ingen source, location, plausibility, stationId",
          reason: "Så lite metadata at det ikke kan brukes til noe",
          recommendation: "REVIEW – vurder DELETE eller KEEP for neste fase"
        }
      },

      action_plan: {
        phase1_sourceName: {
          action: "Backfill sourceName = 'user_reported' for poster uten stationId",
          affectedCount: userReportedCandidates.length,
          query: "WHERE sourceName IS NULL OR sourceName = 'unknown'",
          sqlLike: "UPDATE FuelPrice SET sourceName='user_reported', sourceFrequency='unknown', fetchedAt=NOW() WHERE stationId IS NULL AND sourceName IS NULL"
        },
        phase2_plausibility: {
          action: "Klassifiser plausibilityStatus retroaktivt fra priceNok",
          affectedCount: classifiableCount,
          query: "WHERE plausibilityStatus IS NULL OR plausibilityStatus = 'unknown'",
          note: "Kjør classifyPricePlausibility(priceNok) for alle"
        },
        phase3_locationLabel: {
          action: "Slå opp Station.city for poster med stationId men uten locationLabel",
          affectedCount: withStationId,
          query: "WHERE locationLabel IS NULL AND stationId IS NOT NULL",
          method: "JOIN med Station entity"
        },
        phase4_cleanup: {
          action: "Slett poster med broken prices",
          affectedCount: irreparableCandidates.length,
          query: "WHERE priceNok <= 0 OR priceNok IS NULL",
          note: "SIKKERHET: Dobbeltsjekk før sletting"
        }
      },

      summary: {
        canBeSaved: userReportedCandidates.length + classifiableCount + withStationId,
        shouldBeDeleted: irreparableCandidates.length,
        uncertain: weakRecords.length,
        totalAffected: userReportedCandidates.length + classifiableCount + withStationId + irreparableCandidates.length + weakRecords.length
      }
    };

    return Response.json(report);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});