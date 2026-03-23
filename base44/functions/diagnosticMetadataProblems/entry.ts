import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * DIAGNOSTISK RAPPORT: Metadata-problemer i FuelPrice
 * 
 * PROBLEM 1: locationLabel = "no_location" (93%)
 * PROBLEM 2: sourceName = "unknown" (13 poster)
 * PROBLEM 3: plausibilityStatus = unknown (24 poster)
 * 
 * Undersøker hvor i pipeline metadata ikke settes
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Hent alle FuelPrice records
    const allPrices = await base44.entities.FuelPrice.list('-fetchedAt', 1000);
    
    if (!allPrices || allPrices.length === 0) {
      return Response.json({ total: 0, message: "No FuelPrice records found" });
    }

    const total = allPrices.length;
    const report = {
      timestamp: new Date().toISOString(),
      total,

      // ========== PROBLEM 1: locationLabel ==========
      problem1_locationLabel: {
        title: "locationLabel er 'no_location' eller mangler",
        affectedCount: 0,
        affectedPercentage: 0,
        bySource: {},
        byPriceType: {},
        samplesWithoutLocation: [],
        whereItShouldBeSet: [
          "1. LogPrice (user_reported) – bruker Nominatim reverse geocode (lines 93-98)",
          "2. GooglePlaces (station_level) – skal settes fra Station.city via stationId",
          "3. FetchSSBData (national_average) – skal være 'Norge (snitt)'"
        ],
        foundIssues: []
      },

      // ========== PROBLEM 2: sourceName ==========
      problem2_sourceName: {
        title: "sourceName er 'unknown' eller mangler",
        affectedCount: 0,
        affectedPercentage: 0,
        bySourceValue: {},
        samplesWithoutSource: [],
        whereItShouldBeSet: [
          "1. LogPrice.handleSubmit() – SETTER IKKE sourceName! (lines 155-161)",
          "2. fetchGooglePlacesRealMatching() – SETTER sourceName='GooglePlaces' (line 322)",
          "3. fetchGooglePlacesPrices() – SETTER sourceName='GooglePlaces' (line 381)",
          "4. fetchSSBData() – SETTER sourceName='SSB'"
        ],
        culprit: "LogPrice page – oppretter FuelPrice uten sourceName"
      },

      // ========== PROBLEM 3: plausibilityStatus ==========
      problem3_plausibility: {
        title: "plausibilityStatus er 'unknown' eller mangler",
        affectedCount: 0,
        affectedPercentage: 0,
        byPlausibilityValue: {},
        samplesUnknown: [],
        retroactiveFix: {
          totalFixable: 0,
          totalIrreparable: 0,
          analysis: []
        },
        whereItShouldBeSet: [
          "1. fetchGooglePlacesRealMatching() – SETTER plausibilityStatus (line 290)",
          "2. fetchGooglePlacesPrices() – SETTER plausibilityStatus (line 347)",
          "3. LogPrice.handleSubmit() – SETTER IKKE plausibilityStatus! (lines 155-161)",
          "4. fetchSSBData() – SETTER plausibilityStatus"
        ],
        culprit: "LogPrice page – oppretter FuelPrice uten plausibilityStatus"
      }
    };

    // Analyser PROBLEM 1: locationLabel
    allPrices.forEach(p => {
      const hasLocation = p.locationLabel && p.locationLabel !== 'no_location';
      
      if (!hasLocation) {
        report.problem1_locationLabel.affectedCount++;
        
        // Kategoriser hvor feil oppstår
        const source = p.sourceName || 'unknown';
        if (!report.problem1_locationLabel.bySource[source]) {
          report.problem1_locationLabel.bySource[source] = 0;
        }
        report.problem1_locationLabel.bySource[source]++;

        const priceType = p.priceType || 'unknown';
        if (!report.problem1_locationLabel.byPriceType[priceType]) {
          report.problem1_locationLabel.byPriceType[priceType] = 0;
        }
        report.problem1_locationLabel.byPriceType[priceType]++;

        if (report.problem1_locationLabel.samplesWithoutLocation.length < 5) {
          report.problem1_locationLabel.samplesWithoutLocation.push({
            id: p.id,
            source: p.sourceName,
            priceType: p.priceType,
            price: p.priceNok,
            stationId: p.stationId || 'null',
            created: p.created_date
          });
        }
      }
    });

    report.problem1_locationLabel.affectedPercentage = ((report.problem1_locationLabel.affectedCount / total) * 100).toFixed(1);

    // Diagnostikk for PROBLEM 1
    if (report.problem1_locationLabel.bySource['user_reported'] > 0) {
      report.problem1_locationLabel.foundIssues.push({
        severity: "HIGH",
        issue: "user_reported (LogPrice) har ingen locationLabel",
        reason: "LogPrice bruker Nominatim reverse geocode (line 93-98), men settes aldri på FuelPrice-entity",
        fix: "Må legge til locationLabel i LogPrice.handleSubmit() fra stationInfo.city"
      });
    }

    if (report.problem1_locationLabel.bySource['GooglePlaces'] > 0) {
      report.problem1_locationLabel.foundIssues.push({
        severity: "MEDIUM",
        issue: "GooglePlaces har ingen locationLabel",
        reason: "GooglePlaces har stationId, men locationLabel skal hentes fra Station.city via join",
        fix: "Dashboard/StatRegionalStats skulle slå opp Station.city når stationId finnes"
      });
    }

    // Analyser PROBLEM 2: sourceName
    const unknownSourcePrices = [];
    allPrices.forEach(p => {
      const source = p.sourceName || 'unknown';
      
      if (!report.problem2_sourceName.bySourceValue[source]) {
        report.problem2_sourceName.bySourceValue[source] = 0;
      }
      report.problem2_sourceName.bySourceValue[source]++;

      if (source === 'unknown') {
        report.problem2_sourceName.affectedCount++;
        unknownSourcePrices.push(p);
        
        if (report.problem2_sourceName.samplesWithoutSource.length < 5) {
          report.problem2_sourceName.samplesWithoutSource.push({
            id: p.id,
            priceType: p.priceType,
            locationLabel: p.locationLabel,
            price: p.priceNok,
            fuelType: p.fuelType,
            created: p.created_date
          });
        }
      }
    });

    report.problem2_sourceName.affectedPercentage = ((report.problem2_sourceName.affectedCount / total) * 100).toFixed(1);

    // Diagnostikk for PROBLEM 2
    const userReportedUnknown = unknownSourcePrices.filter(p => p.priceType === 'user_reported').length;
    if (userReportedUnknown > 0) {
      report.problem2_sourceName.foundIssues = [{
        severity: "CRITICAL",
        culprit: "LogPrice page (lines 155-161)",
        code: "await base44.entities.FuelPrice.bulkCreate(entries)",
        issue: `${userReportedUnknown} user_reported poster opprettes UTEN sourceName`,
        reason: "entries-objektet inneholder ikke sourceName eller sourceFrequency",
        fix: "Legg til: sourceName: 'user_reported', sourceFrequency: 'unknown', plausibilityStatus: classifyPrice(), fetchedAt: now, sourceUpdatedAt: null"
      }];
    }

    // Analyser PROBLEM 3: plausibilityStatus
    const unknownPlausibilityPrices = [];
    allPrices.forEach(p => {
      const status = p.plausibilityStatus || 'unknown';
      
      if (!report.problem3_plausibility.byPlausibilityValue[status]) {
        report.problem3_plausibility.byPlausibilityValue[status] = 0;
      }
      report.problem3_plausibility.byPlausibilityValue[status]++;

      if (status === 'unknown') {
        report.problem3_plausibility.affectedCount++;
        unknownPlausibilityPrices.push(p);
        
        if (report.problem3_plausibility.samplesUnknown.length < 5) {
          report.problem3_plausibility.samplesUnknown.push({
            id: p.id,
            priceNok: p.priceNok,
            source: p.sourceName,
            priceType: p.priceType,
            created: p.created_date
          });
        }
      }
    });

    report.problem3_plausibility.affectedPercentage = ((report.problem3_plausibility.affectedCount / total) * 100).toFixed(1);

    // Retroaktiv klassifisering
    if (unknownPlausibilityPrices.length > 0) {
      function classifyPrice(priceNok) {
        if (!priceNok) return 'unknown';
        if (priceNok < 10) return 'suspect_price_low';
        if (priceNok > 30) return 'suspect_price_high';
        return 'realistic_price';
      }

      unknownPlausibilityPrices.forEach(p => {
        const newStatus = classifyPrice(p.priceNok);
        const isFixable = newStatus !== 'unknown';
        
        if (isFixable) {
          report.problem3_plausibility.retroactiveFix.totalFixable++;
        } else {
          report.problem3_plausibility.retroactiveFix.totalIrreparable++;
        }
      });

      report.problem3_plausibility.retroactiveFix.analysis.push({
        message: `Av ${unknownPlausibilityPrices.length} unknown-poster: ${report.problem3_plausibility.retroactiveFix.totalFixable} kan klassifiseres retroaktivt basert på priceNok`,
        percentage: ((report.problem3_plausibility.retroactiveFix.totalFixable / unknownPlausibilityPrices.length) * 100).toFixed(1) + "%"
      });
    }

    // Diagnostikk for PROBLEM 3
    const userReportedUnknownPlausibility = unknownPlausibilityPrices.filter(p => p.priceType === 'user_reported').length;
    if (userReportedUnknownPlausibility > 0) {
      report.problem3_plausibility.foundIssues = [{
        severity: "CRITICAL",
        culprit: "LogPrice page (lines 155-161)",
        issue: `${userReportedUnknownPlausibility} user_reported poster opprettes UTEN plausibilityStatus`,
        reason: "entries-objektet inneholder ikke plausibilityStatus",
        fix: "Legg til: plausibilityStatus: classifyPricePlausibility(price)"
      }];
    }

    // SUMMARY
    return Response.json({
      report,
      summary: {
        rootCauses: [
          {
            culprit: "LogPrice page (handleSubmit, lines 155-161)",
            issues: [
              "Mangler sourceName – skal være 'user_reported'",
              "Mangler sourceFrequency – skal være 'unknown'",
              "Mangler plausibilityStatus – skal beregnes fra priceNok",
              "Mangler fetchedAt – skal være new Date().toISOString()",
              "Mangler sourceUpdatedAt – skal være null for user_reported"
            ]
          },
          {
            culprit: "Dashboard/StatRegionalStats – mangler Station-lookup",
            issues: [
              "locationLabel skal hentes fra Station.city når stationId finnes",
              "RegionalStats burde slå opp Station-data i stedet for å stole på locationLabel"
            ]
          }
        ],
        actionItems: [
          {
            priority: "CRITICAL",
            task: "Fix LogPrice.handleSubmit() – legg til manglende metadata",
            estimate: "30 minutter"
          },
          {
            priority: "HIGH",
            task: "Backfill user_reported poster med sourceName, sourceFrequency, plausibilityStatus, fetchedAt",
            estimate: "1 time"
          },
          {
            priority: "MEDIUM",
            task: "Oppdater RegionalStats for å bruke Station-lookup når stationId finnes",
            estimate: "1 time"
          },
          {
            priority: "MEDIUM",
            task: "Retroaktiv klassifisering av 24 poster med unknown plausibilityStatus",
            estimate: "30 minutter"
          }
        ]
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});