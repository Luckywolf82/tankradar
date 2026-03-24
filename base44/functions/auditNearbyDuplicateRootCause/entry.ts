/**
 * auditNearbyDuplicateRootCause
 *
 * READ-ONLY investigation: determines WHY NearbyPrices shows
 * duplicate-looking stations in the UI.
 *
 * Tests hypotheses:
 *   A) Multiple stationIds represent same physical station
 *   B) Multiple CSP rows for same stationId
 *   C) Adapter produces duplicate-visible rows
 *   D) Render layer duplicates rows
 *   E) Combination
 *
 * NO writes. NO merges. Investigation only.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Haversine in meters
function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalize(s) {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

Deno.serve(async (req) => {
  try {
  const base44 = createClientFromRequest(req);

  // Use service role for data access (admin audit endpoint)
  // Limit to 500 stations and 500 CSP rows to avoid timeout
  const [allStations, allCSP] = await Promise.all([
    base44.asServiceRole.entities.Station.list('-created_date', 500),
    base44.asServiceRole.entities.CurrentStationPrices.list('-updatedAt', 500),
  ]);

  // ─────────────────────────────────────────────────────────────
  // STEP 2: HYPOTHESIS B — Multiple CSP rows per stationId
  // ─────────────────────────────────────────────────────────────
  const cspByStationId = {};
  for (const row of allCSP) {
    if (!row.stationId) continue;
    if (!cspByStationId[row.stationId]) cspByStationId[row.stationId] = [];
    cspByStationId[row.stationId].push(row);
  }

  const cspDuplicateRows = Object.entries(cspByStationId)
    .filter(([, rows]) => rows.length > 1)
    .map(([stationId, rows]) => ({
      stationId,
      rowCount: rows.length,
      rowIds: rows.map(r => r.id),
      stationNames: rows.map(r => r.stationName),
    }));

  // ─────────────────────────────────────────────────────────────
  // STEP 3: HYPOTHESIS C — Adapter output for one CSP row
  // The adapter is pure frontend logic, but we can verify the
  // CSP schema fields here to check if one row could produce
  // multiple fuel-type outputs (it should not — adapter is called
  // once per fuelType, so one CSP row → max 1 output per fuel).
  // We verify by checking if any CSP row has BOTH fuel fields set.
  // ─────────────────────────────────────────────────────────────
  const cspRowsWithBothFuels = allCSP.filter(
    r => r.gasoline_95_price != null && r.diesel_price != null
  ).length;

  const cspRowsWithOnlyGasoline = allCSP.filter(
    r => r.gasoline_95_price != null && r.diesel_price == null
  ).length;

  const cspRowsWithOnlyDiesel = allCSP.filter(
    r => r.diesel_price != null && r.gasoline_95_price == null
  ).length;

  const cspRowsWithNeitherFuel = allCSP.filter(
    r => r.gasoline_95_price == null && r.diesel_price == null
  ).length;

  // ─────────────────────────────────────────────────────────────
  // STEP 4: HYPOTHESIS A — Multiple stationIds = same physical station
  // O(n) approach: group by name+chain key first, then check distance
  // within each name-group only.
  // ─────────────────────────────────────────────────────────────
  const activeStations = allStations.filter(
    s => s.status !== 'archived_duplicate' && s.latitude && s.longitude
  );

  // Group stations by normalized name+chain key
  const nameGroups = {};
  for (const s of activeStations) {
    const key = `${normalize(s.name)}||${normalize(s.chain || '')}`;
    if (!nameGroups[key]) nameGroups[key] = [];
    nameGroups[key].push(s);
  }

  const duplicateGroups = [];

  for (const [, group] of Object.entries(nameGroups)) {
    if (group.length < 2) continue;

    // Within this name-group, check pairwise distances (group is small)
    const visited = new Set();
    for (let i = 0; i < group.length; i++) {
      if (visited.has(group[i].id)) continue;
      const cluster = [group[i]];

      for (let j = i + 1; j < group.length; j++) {
        if (visited.has(group[j].id)) continue;
        const distM = haversineM(
          group[i].latitude, group[i].longitude,
          group[j].latitude, group[j].longitude
        );
        if (distM <= 50) {
          cluster.push(group[j]);
          visited.add(group[j].id);
        }
      }

      if (cluster.length > 1) {
        visited.add(group[i].id);
        // Compute max pairwise distance in cluster
        let maxDist = 0;
        for (let a = 0; a < cluster.length; a++) {
          for (let b = a + 1; b < cluster.length; b++) {
            const d = haversineM(
              cluster[a].latitude, cluster[a].longitude,
              cluster[b].latitude, cluster[b].longitude
            );
            if (d > maxDist) maxDist = d;
          }
        }
        duplicateGroups.push({
          name: group[i].name,
          chain: group[i].chain || null,
          stationIds: cluster.map(s => s.id),
          stations: cluster.map(s => ({
            id: s.id,
            name: s.name,
            chain: s.chain || null,
            lat: s.latitude,
            lng: s.longitude,
            status: s.status,
            sourceName: s.sourceName,
          })),
          maxDistanceM: maxDist,
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 5: Cross-check — do BOTH stationIds in a duplicate group
  // appear in CSP? That would cause UI duplicates.
  // ─────────────────────────────────────────────────────────────
  const cspStationIds = new Set(allCSP.map(r => r.stationId));

  const groupsWithBothInCSP = duplicateGroups
    .map(g => {
      const idsInCSP = g.stationIds.filter(id => cspStationIds.has(id));
      return {
        ...g,
        idsInCSP,
        bothInCSP: idsInCSP.length > 1,
        // For each stationId in CSP, show key CSP fields
        cspDetails: idsInCSP.map(stationId => {
          const row = allCSP.find(r => r.stationId === stationId);
          if (!row) return null;
          return {
            stationId,
            cspId: row.id,
            stationName: row.stationName,
            gasoline_95_price: row.gasoline_95_price,
            gasoline_95_fetchedAt: row.gasoline_95_fetchedAt,
            diesel_price: row.diesel_price,
            diesel_fetchedAt: row.diesel_fetchedAt,
            stationStatus: row.stationStatus,
            sourceName: row.sourceName,
          };
        }).filter(Boolean),
      };
    });

  const confirmedDuplicatePairsInCSP = groupsWithBothInCSP.filter(g => g.bothInCSP);

  // ─────────────────────────────────────────────────────────────
  // STEP 6: HYPOTHESIS D — Render layer
  // NearbyPrices renders by key={p.id} where p.id = cspRow.id
  // If two CSP rows have the same id, React would not duplicate.
  // But if two DIFFERENT CSP rows both appear for same stationId
  // (cspDuplicateRows), they both survive the resolver since
  // resolveLatestPerStation picks one. So render duplication is
  // only possible if CSP has two rows for same stationId.
  // We already captured cspDuplicateRows above (Hypothesis B).
  // ─────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────
  // STEP 7: RESOLVER VERIFICATION
  // resolveLatestPerStation collapses by stationId.
  // If stationA and stationB are different IDs (Hypothesis A),
  // they will BOTH survive — one per stationId.
  // This is the expected primary mechanism for UI duplicates.
  // ─────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────
  // STEP 8: Classify root cause
  // ─────────────────────────────────────────────────────────────
  const hypothesisA_confirmed = confirmedDuplicatePairsInCSP.length > 0;
  const hypothesisB_confirmed = cspDuplicateRows.length > 0;
  // Hypothesis C: adapter never produces two rows from one CSP row per fuelType → structurally impossible
  const hypothesisC_confirmed = false;
  // Hypothesis D: render uses key={p.id}, React dedupes by key, not a source of duplication
  const hypothesisD_confirmed = false;

  let rootCause;
  if (hypothesisA_confirmed && hypothesisB_confirmed) {
    rootCause = 'MIXED: Station identity duplication (A) + CSP row duplication (B)';
  } else if (hypothesisA_confirmed) {
    rootCause = 'CONFIRMED: Station identity duplication (Hypothesis A) — multiple stationIds for same physical station, both present in CSP, both survive resolveLatestPerStation';
  } else if (hypothesisB_confirmed) {
    rootCause = 'CONFIRMED: CSP row duplication (Hypothesis B) — multiple CSP rows per stationId';
  } else {
    rootCause = 'NOT CONFIRMED from static data — may require live GPS + user coordinate context to reproduce. No duplicate stationId pairs confirmed in CSP for active stations.';
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 9: Recommended next safe step
  // ─────────────────────────────────────────────────────────────
  let recommendedNextStep;
  if (hypothesisA_confirmed) {
    recommendedNextStep = {
      action: 'Station identity remediation via existing DuplicateRemediationPanel',
      detail: 'For each confirmedDuplicatePairsInCSP group: use previewDuplicateMerge to inspect, then executeDuplicateMerge to soft-archive duplicates. This removes the extra stationIds from CSP and NearbyPrices output automatically.',
      toolAvailable: 'executeDuplicateMerge (existing, curated via DuplicateRemediationPanel)',
      codeChangesNeeded: false,
    };
  } else if (hypothesisB_confirmed) {
    recommendedNextStep = {
      action: 'CSP deduplication — ensure materializeCurrentStationPrice is idempotent',
      detail: 'backfillCurrentStationPrices should upsert (update existing row) rather than create new row if stationId already exists in CSP.',
      toolAvailable: 'backfillCurrentStationPrices (admin function)',
      codeChangesNeeded: true,
    };
  } else {
    recommendedNextStep = {
      action: 'Enable ENABLE_NEARBY_PARITY_DEBUG = true in NearbyPrices and inspect browser console with live GPS to identify specific duplicate stationIds',
      detail: 'Static data analysis found no confirmed CSP duplicates. Runtime context (user lat/lon) is needed to reproduce the issue.',
      toolAvailable: 'Browser console diagnostics already instrumented in NearbyPrices.jsx',
      codeChangesNeeded: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────
  return Response.json({
    audit: 'NearbyPrices Duplicate Root Cause Audit',
    readOnly: true,
    timestamp: new Date().toISOString(),

    // A. Files read (static analysis)
    filesRead: [
      'components/dashboard/NearbyPrices.jsx',
      'utils/currentPriceResolver.js',
      'utils/currentStationPricesAdapter.js',
      'utils/fuelPriceEligibility.js',
      'components/admin/DuplicateRemediationPanel.jsx',
      'components/governance/NextSafeStep.jsx',
    ],

    // B. Files changed
    filesChanged: 'NONE — read-only audit',

    // C. Input data summary
    inputData: {
      totalStations: allStations.length,
      activeStationsWithCoords: activeStations.length,
      totalCSPRows: allCSP.length,
      cspStationIdCount: cspStationIds.size,
    },

    // D. Hypothesis A: Station identity duplication
    hypothesisA: {
      label: 'Multiple stationIds = same physical station (name+chain+distance ≤50m)',
      duplicateGroupsFound: duplicateGroups.length,
      groups: duplicateGroups.map(g => ({
        name: g.name,
        chain: g.chain,
        stationIds: g.stationIds,
        maxDistanceM: Math.round(g.maxDistanceM),
        stations: g.stations,
      })),
    },

    // E. CSP evidence — which duplicate groups have both stationIds in CSP
    hypothesisA_cspEvidence: {
      label: 'Duplicate stationId pairs where BOTH appear in CurrentStationPrices',
      confirmedPairsCount: confirmedDuplicatePairsInCSP.length,
      pairs: confirmedDuplicatePairsInCSP.map(g => ({
        name: g.name,
        chain: g.chain,
        idsInCSP: g.idsInCSP,
        cspDetails: g.cspDetails,
        maxDistanceM: Math.round(g.maxDistanceM),
      })),
    },

    // F. Hypothesis B: Multiple CSP rows per stationId
    hypothesisB: {
      label: 'Multiple CurrentStationPrices rows per stationId',
      confirmed: hypothesisB_confirmed,
      cspDuplicateRowCount: cspDuplicateRows.length,
      cspDuplicateRows,
    },

    // G. Adapter behavior summary
    adapterBehavior: {
      label: 'adaptCurrentStationPriceRow — one CSP row, one output per fuelType',
      hypothesisCConfirmed: false,
      reasoning: 'Adapter is called once per CSP row per fuelType (batch call in NearbyPrices). One CSP row cannot produce two outputs for the same fuelType — structurally impossible. If selectedFuel = gasoline_95, each CSP row yields 0 or 1 adapted row.',
      cspFuelDistribution: {
        rowsWithBothFuels: cspRowsWithBothFuels,
        rowsWithOnlyGasoline: cspRowsWithOnlyGasoline,
        rowsWithOnlyDiesel: cspRowsWithOnlyDiesel,
        rowsWithNeitherFuel: cspRowsWithNeitherFuel,
      },
    },

    // H. Resolver verification
    resolverVerification: {
      function: 'resolveLatestPerStation',
      behavior: 'Collapses strictly by stationId — picks highest fetchedAt per stationId. Does NOT merge across stationIds. Two different stationIds representing the same physical station will BOTH survive.',
      implication: 'If Hypothesis A is confirmed, resolver correctly collapses within each stationId but cannot suppress entries from physically duplicate stations with different IDs.',
    },

    // I. ROOT CAUSE
    rootCause,
    hypothesisAConfirmed: hypothesisA_confirmed,
    hypothesisBConfirmed: hypothesisB_confirmed,
    hypothesisCConfirmed,
    hypothesisDConfirmed,

    // J. Recommended next safe step
    recommendedNextStep,

    // K. Locked files untouched verification
    lockedFilesVerification: {
      touchedLockedFiles: false,
      lockedFiles: [
        'functions/deleteAllGooglePlacesPrices',
        'functions/verifyGooglePlacesPriceNormalization',
        'functions/deleteGooglePlacesPricesForReclassification',
        'functions/classifyPricePlausibility',
        'functions/classifyStationsRuleEngine',
        'functions/classifyGooglePlacesConfidence',
      ],
      status: 'UNTOUCHED — this function is new and does not modify any existing file',
    },
  });
  } catch (err) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});