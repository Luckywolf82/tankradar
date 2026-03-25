import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * runGooglePlacesFetchAutomation
 *
 * Zone-driven Google Places fetch engine.
 * Reads active GPFetchZone records and fetches GP prices for each active zone.
 *
 * Zone config:
 *   isActive: true/false — controls whether zone is included in this run
 *   priority: high / normal / low — currently informational, all active zones run
 *   radiusMeters: search radius per zone
 *
 * Rules:
 * ✓ Only active zones are fetched
 * ✓ Parser locked (gp_v1)
 * ✓ Plausibility check before persistence
 * ✓ In-memory dedup (stationId|fuelType|price|updateTime)
 * ✓ No merge engine
 * ✓ Batch create
 * ✓ FetchLog per run
 * ✓ Zone lastFetchedAt updated after each successful zone fetch
 */

function normalizeChain(name) {
  if (!name) return null;
  const normalized = name.toLowerCase().trim().replace(/[-\s]+/g, " ").replace(/\s+/g, " ");
  const chainMap = {
    "esso norway": "esso", "essono": "esso", "essopluss": "esso",
    "circle k": "circle k", "circlekiosk": "circle k", "circlekiosks": "circle k", "circlek": "circle k",
    "uno x": "uno x", "uno-x": "uno x", "unox": "uno x", "unoxpress": "uno x"
  };
  return chainMap[normalized] || normalized;
}

function normalizeFuelType(googleType) {
  const mapping = { "SP95": "gasoline_95", "SP98": "gasoline_98", "DIESEL": "diesel" };
  return mapping[googleType] || null;
}

function extractPriceNok(priceObj) {
  if (!priceObj || priceObj.currencyCode !== "NOK") return null;
  const units = Number(priceObj.units) || 0;
  const nanos = Number(priceObj.nanos) || 0;
  return units + (nanos / 1e9);
}

function classifyPricePlausibility(priceNok) {
  if (priceNok === null || priceNok === undefined) return null;
  if (priceNok < 10) return "suspect_price_low";
  if (priceNok > 30) return "suspect_price_high";
  return "realistic_price";
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchStationToPriceSource(googlePlace, allStations) {
  const googleName = googlePlace.displayName?.text || "";
  const googleLat = googlePlace.location?.latitude;
  const googleLon = googlePlace.location?.longitude;
  if (!googleLat || !googleLon) return null;

  const lowerName = googleName.toLowerCase();
  let inferredChain = null;
  if (lowerName.includes("circle k")) inferredChain = "circle k";
  else if (lowerName.includes("uno") && lowerName.includes("x")) inferredChain = "uno x";
  else if (lowerName.includes("esso")) inferredChain = "esso";
  else if (lowerName.includes("shell")) inferredChain = "shell";
  else if (lowerName.includes("statoil")) inferredChain = "statoil";
  else if (lowerName.includes("st1")) inferredChain = "st1";
  if (!inferredChain) return null;

  const normalizedGoogleChain = normalizeChain(inferredChain);
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const station of allStations) {
    if (!station.latitude || !station.longitude || !station.chain) continue;
    const distanceMeters = haversineDistance(googleLat, googleLon, station.latitude, station.longitude);
    if (distanceMeters > 500) continue;
    if (normalizeChain(station.chain) !== normalizedGoogleChain) continue;

    let confidence = 0;
    if (distanceMeters < 50) confidence = googleName.toLowerCase().includes((station.name || "").toLowerCase()) ? 0.90 : 0.85;
    else if (distanceMeters < 150) confidence = 0.80;
    else if (distanceMeters < 300) confidence = 0.65;
    else if (distanceMeters < 500) confidence = 0.55;

    if (distanceMeters < bestDistance) {
      bestMatch = { station, distanceMeters, confidence };
      bestDistance = distanceMeters;
    }
  }
  return bestMatch;
}

async function fetchGooglePlacesForZone(apiKey, zone) {
  const url = "https://places.googleapis.com/v1/places:searchNearby";
  const body = {
    includedTypes: ["gas_station"],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: zone.latitude, longitude: zone.longitude },
        radius: zone.radiusMeters || 5000
      }
    }
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.fuelOptions"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) return { success: false, error: `HTTP ${response.status}`, zone: zone.name };
    const data = await response.json();
    return { success: true, zone: zone.name, zoneId: zone.id, places: data.places || [] };
  } catch (error) {
    return { success: false, error: error.message, zone: zone.name };
  }
}

Deno.serve(async (req) => {
  const automationStartedAt = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) return Response.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 500 });

    // ── 1. Load active zones ───────────────────────────────────────────────────
    const allZones = await db.entities.GPFetchZone.list();
    const activeZones = allZones.filter(z => z.isActive === true);

    if (activeZones.length === 0) {
      return Response.json({
        success: true,
        message: "No active GPFetchZones. Nothing to fetch.",
        activeZones: 0,
        totalZones: allZones.length
      });
    }

    // ── 2. Load stations catalog ──────────────────────────────────────────────
    const allStations = await db.entities.Station.list();

    // ── 3. Single upfront dedup load ─────────────────────────────────────────
    const existingGPPrices = await db.entities.FuelPrice.filter({ sourceName: "GooglePlaces" }, "-created_date", 2000);
    const dedupMap = {};
    for (const row of existingGPPrices) {
      const key = `${row.stationId}|${row.fuelType}`;
      if (!dedupMap[key]) dedupMap[key] = { priceNok: row.priceNok, sourceUpdatedAt: row.sourceUpdatedAt };
    }

    // ── 4. Stats accumulator ──────────────────────────────────────────────────
    const stats = {
      zonesActive: activeZones.length,
      zonesTotal: allZones.length,
      zoneSummaries: [],
      totalGooglePlacesResults: 0,
      stationsWithPriceData: 0,
      stationsWithoutPriceData: 0,
      observationsMatched: 0,
      observationsUnmatched: 0,
      highConfidenceObservations: 0,
      reviewNeededObservations: 0,
      observationsByPlausibility: { realistic_price: 0, suspect_price_low: 0, suspect_price_high: 0 },
      fuelPricesCreated: 0,
      fuelPricesDeduplicated: 0,
      fuelPricesSkipped: 0
    };

    const newPriceRecords = [];

    // ── 5. Fetch each active zone ─────────────────────────────────────────────
    for (const zone of activeZones) {
      const zoneResult = await fetchGooglePlacesForZone(apiKey, zone);

      if (!zoneResult.success) {
        stats.zoneSummaries.push({ zone: zone.name, success: false, error: zoneResult.error });
        continue;
      }

      let zoneCreated = 0;
      let zoneMatched = 0;

      for (const googlePlace of zoneResult.places) {
        stats.totalGooglePlacesResults++;
        const fuelOptions = googlePlace.fuelOptions?.fuelPrices || [];

        if (fuelOptions.length === 0) { stats.stationsWithoutPriceData++; continue; }
        stats.stationsWithPriceData++;

        const matchResult = matchStationToPriceSource(googlePlace, allStations);
        if (!matchResult) { stats.observationsUnmatched++; continue; }

        stats.observationsMatched++;
        zoneMatched++;
        const station = matchResult.station;
        const isReviewNeeded = matchResult.distanceMeters > 200 || matchResult.confidence < 0.70;
        if (isReviewNeeded) stats.reviewNeededObservations++;
        else stats.highConfidenceObservations++;

        for (const fuelPrice of fuelOptions) {
          const fuelType = normalizeFuelType(fuelPrice.type);
          if (!fuelType) { stats.fuelPricesSkipped++; continue; }

          const priceNok = extractPriceNok(fuelPrice.price);
          if (!priceNok) { stats.fuelPricesSkipped++; continue; }

          const plausibilityStatus = classifyPricePlausibility(priceNok);
          stats.observationsByPlausibility[plausibilityStatus]++;

          const sourceUpdatedAt = fuelPrice.updateTime || null;

          const dedupKey = `${station.id}|${fuelType}`;
          const existing = dedupMap[dedupKey];
          if (existing && existing.priceNok === priceNok && existing.sourceUpdatedAt === sourceUpdatedAt) {
            stats.fuelPricesDeduplicated++;
            continue;
          }

          newPriceRecords.push({
            stationId: station.id,
            fuelType,
            priceNok,
            priceType: "station_level",
            sourceName: "GooglePlaces",
            sourceUrl: null,
            sourceUpdatedAt,
            fetchedAt: new Date().toISOString(),
            sourceFrequency: "near_realtime",
            confidenceScore: matchResult.confidence,
            parserVersion: "gp_v1",
            plausibilityStatus,
            station_match_status: "matched_station_id",
            rawPayloadSnippet: `zone=${zone.name} | ${fuelPrice.type} | ${Math.round(priceNok * 100) / 100} NOK/L`
          });
          zoneCreated++;
        }
      }

      // Update zone lastFetchedAt
      await db.entities.GPFetchZone.update(zone.id, {
        lastFetchedAt: new Date().toISOString(),
        lastFetchStats: JSON.stringify({ places: zoneResult.places.length, matched: zoneMatched, created: zoneCreated })
      });

      stats.zoneSummaries.push({ zone: zone.name, priority: zone.priority, places: zoneResult.places.length, matched: zoneMatched, created: zoneCreated });
    }

    // ── 6. Batch create + materialize ─────────────────────────────────────────
    if (newPriceRecords.length > 0) {
      await db.entities.FuelPrice.bulkCreate(newPriceRecords);
      stats.fuelPricesCreated = newPriceRecords.length;
    }

    for (const record of newPriceRecords) {
      if (record.plausibilityStatus === "realistic_price") {
        db.functions.invoke("materializeCurrentStationPrice", record).catch(() => {});
      }
    }

    // ── 7. FetchLog ───────────────────────────────────────────────────────────
    await db.entities.FetchLog.create({
      sourceName: "GooglePlaces",
      startedAt: automationStartedAt,
      finishedAt: new Date().toISOString(),
      success: true,
      httpStatus: 200,
      stationsFound: stats.totalGooglePlacesResults,
      pricesFound: stats.stationsWithPriceData,
      recordsCreated: stats.fuelPricesCreated,
      recordsSkipped: stats.fuelPricesDeduplicated + stats.fuelPricesSkipped,
      parserVersion: "gp_v1",
      notes: `zones_active=${stats.zonesActive}/${stats.zonesTotal} api=${stats.totalGooglePlacesResults} with_prices=${stats.stationsWithPriceData} matched=${stats.observationsMatched} high=${stats.highConfidenceObservations} review=${stats.reviewNeededObservations} created=${stats.fuelPricesCreated} dedup=${stats.fuelPricesDeduplicated}`
    });

    return Response.json({
      success: true,
      automation: { executedAt: automationStartedAt, completedAt: new Date().toISOString() },
      zones: { active: stats.zonesActive, total: stats.zonesTotal, summaries: stats.zoneSummaries },
      dataflow: {
        google_places_api_results: stats.totalGooglePlacesResults,
        stations_with_price_data: stats.stationsWithPriceData,
        stations_without_price_data: stats.stationsWithoutPriceData,
        matched_to_catalog: stats.observationsMatched,
        unmatched: stats.observationsUnmatched
      },
      classification: { high_confidence: stats.highConfidenceObservations, review_needed: stats.reviewNeededObservations },
      plausibility: stats.observationsByPlausibility,
      persistence: { new_records_created: stats.fuelPricesCreated, deduplicated: stats.fuelPricesDeduplicated, skipped: stats.fuelPricesSkipped }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});