import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Browser-like headers for FuelFinder
const browserHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "DNT": "1",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
};

async function fetchFuelFinderData() {
  const url = "https://www.fuelfinder.no/";
  
  try {
    const res = await fetch(url, {
      headers: browserHeaders,
      timeout: 10000,
    });

    if (!res.ok) {
      return { error: `HTTP ${res.status}`, htmlContent: null, blocked: res.status === 403 || res.status === 429 };
    }

    const html = await res.text();
    return { error: null, htmlContent: html, blocked: false };
  } catch (err) {
    return { error: err.message, htmlContent: null, blocked: false };
  }
}

// Parse HTML for station data - extract JSON from page if available
function parseStations(html) {
  const stations = [];

  // Try to find JSON-LD or embedded data in script tags
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const jsonData = JSON.parse(jsonLdMatch[1]);
      if (jsonData && Array.isArray(jsonData)) {
        jsonData.forEach(item => {
          if (item.name && item.address) {
            stations.push({
              name: item.name,
              chain: item.brand?.name || null,
              address: item.address?.streetAddress || null,
              city: item.address?.addressLocality || null,
              postalCode: item.address?.postalCode || null,
              latitude: item.geo?.latitude || null,
              longitude: item.geo?.longitude || null,
            });
          }
        });
      }
    } catch (e) {
      // Continue to regex fallback
    }
  }

  // Fallback: regex patterns for station names in table/list structures
  // Looking for patterns like "Station Name" in divs or table cells
  const stationPatterns = [
    /<td[^>]*class="[^"]*station[^"]*"[^>]*>([^<]+)<\/td>/gi,
    /<div[^>]*class="[^"]*station[^"]*"[^>]*>([^<]+)<\/div>/gi,
    /<h[2-3][^>]*>([^<]*(?:Circle K|Uno-X|Esso|Shell|YX|Best)[^<]*)<\/h[2-3]>/gi,
  ];

  for (const pattern of stationPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const name = match[1].trim();
      if (name && name.length > 2 && stations.length < 100) {
        stations.push({ name, chain: null, city: null });
      }
    }
  }

  return stations;
}

// Parse prices from HTML
function parsePrices(html) {
  const prices = [];

  // Try JSON data first
  const jsonMatch = html.match(/<script[^>]*>[\s\S]*?(?:window\.prices|var prices|const prices)\s*=\s*(\[[\s\S]*?\]);/);
  if (jsonMatch) {
    try {
      const priceData = JSON.parse(jsonMatch[1]);
      if (Array.isArray(priceData)) {
        priceData.forEach(p => {
          if (p.stationId && p.fuel && p.price) {
            prices.push({
              stationId: p.stationId,
              fuelType: normalizeFuelType(p.fuel),
              priceNok: parseFloat(p.price),
              sourceUpdatedAt: p.timestamp || null,
            });
          }
        });
      }
    } catch (e) {
      // Continue to regex fallback
    }
  }

  // Fallback: regex for price patterns
  // Looking for fuel prices like "bensin 95: 21.50" or similar
  const pricePatterns = [
    /(?:bensin|diesel|95|98)\s*[:\-]?\s*(\d+\.\d{2})/gi,
  ];

  for (const pattern of pricePatterns) {
    let match;
    let count = 0;
    while ((match = pattern.exec(html)) !== null && count < 50) {
      const price = parseFloat(match[1]);
      if (price > 5 && price < 50) {
        prices.push({
          stationId: null,
          fuelType: "gasoline_95",
          priceNok: price,
          sourceUpdatedAt: null,
        });
        count++;
      }
    }
  }

  return prices;
}

function normalizeFuelType(fuelStr) {
  const lower = (fuelStr || "").toLowerCase();
  if (lower.includes("98")) return "gasoline_98";
  if (lower.includes("diesel")) return "diesel";
  return "gasoline_95";
}

function normalizeStationName(name) {
  return (name || "").toLowerCase().trim();
}

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);

    // Fetch FuelFinder data
    const { error, htmlContent, blocked } = await fetchFuelFinderData();

    if (blocked) {
      const fetchLog = await base44.asServiceRole.entities.FetchLog.create({
        sourceName: "FuelFinder",
        startedAt: startedAt,
        finishedAt: new Date().toISOString(),
        success: false,
        httpStatus: 403,
        recordsFound: 0,
        recordsCreated: 0,
        recordsSkipped: 0,
        parserVersion: "ff_no_v1",
        errorMessage: "FuelFinder returned 403 Forbidden – requires headless browser or JavaScript rendering",
        notes: "KOMPROMISS: FuelFinder requires browser-like scraping with JavaScript execution"
      });

      return Response.json({
        error: "FuelFinder blocked",
        blocked: true,
        requiresHeadless: true,
        fetchLogId: fetchLog.id
      }, { status: 403 });
    }

    if (error) {
      const fetchLog = await base44.asServiceRole.entities.FetchLog.create({
        sourceName: "FuelFinder",
        startedAt: startedAt,
        finishedAt: new Date().toISOString(),
        success: false,
        httpStatus: null,
        recordsFound: 0,
        recordsCreated: 0,
        recordsSkipped: 0,
        parserVersion: "ff_no_v1",
        errorMessage: error,
        notes: null
      });

      return Response.json({ error, fetchLogId: fetchLog.id }, { status: 500 });
    }

    // Parse stations and prices
    const stations = parseStations(htmlContent);
    const prices = parsePrices(htmlContent);

    let recordsCreated = 0;
    let recordsSkipped = 0;

    // Process stations: create or match
    const stationMap = {}; // stationId -> Station record
    for (const stationData of stations) {
      if (!stationData.name) continue;

      const normalizedName = normalizeStationName(stationData.name);

      // Try to find existing station
      const existing = await base44.asServiceRole.entities.Station.filter({
        normalizedName: normalizedName,
        sourceName: "FuelFinder"
      });

      let stationId;
      if (existing.length > 0) {
        stationId = existing[0].id;
        recordsSkipped++;
      } else {
        const created = await base44.asServiceRole.entities.Station.create({
          name: stationData.name,
          chain: stationData.chain,
          address: stationData.address,
          city: stationData.city,
          postalCode: stationData.postalCode,
          latitude: stationData.latitude,
          longitude: stationData.longitude,
          sourceName: "FuelFinder",
          normalizedName: normalizedName,
          sourceStationId: null
        });
        stationId = created.id;
        recordsCreated++;
      }

      stationMap[stationData.name] = stationId;
    }

    // Process prices: create FuelPrice records
    const fetchedAt = new Date().toISOString();
    for (const priceData of prices) {
      // Skip if no fuel type could be extracted
      if (!priceData.fuelType) continue;

      // Try to match station – for now, if no stationId in price, use first available
      let matchedStationId = null;
      if (priceData.stationId && stationMap[priceData.stationId]) {
        matchedStationId = stationMap[priceData.stationId];
      } else if (Object.keys(stationMap).length > 0) {
        // Fallback: use first station (very basic; should improve with better matching)
        matchedStationId = Object.values(stationMap)[0];
      }

      if (!matchedStationId) {
        recordsSkipped++;
        continue;
      }

      // Check if this price already exists for today
      const existing = await base44.asServiceRole.entities.FuelPrice.filter({
        stationId: matchedStationId,
        fuelType: priceData.fuelType,
        sourceName: "FuelFinder",
        sourceUpdatedAt: priceData.sourceUpdatedAt || null
      });

      if (existing.length === 0) {
        await base44.asServiceRole.entities.FuelPrice.create({
          stationId: matchedStationId,
          locationLabel: null,
          fuelType: priceData.fuelType,
          priceNok: priceData.priceNok,
          priceType: "station_level",
          sourceName: "FuelFinder",
          sourceUrl: "https://www.fuelfinder.no/",
          sourceUpdatedAt: priceData.sourceUpdatedAt,
          fetchedAt: fetchedAt,
          sourceFrequency: "daily",
          confidenceScore: 0.5,
          parserVersion: "ff_no_v1",
          rawPayloadSnippet: `${priceData.fuelType}: ${priceData.priceNok} NOK/L`
        });
        recordsCreated++;
      } else {
        recordsSkipped++;
      }
    }

    // Log the fetch
    const fetchLog = await base44.asServiceRole.entities.FetchLog.create({
      sourceName: "FuelFinder",
      startedAt: startedAt,
      finishedAt: new Date().toISOString(),
      success: true,
      httpStatus: 200,
      recordsFound: stations.length + prices.length,
      recordsCreated: recordsCreated,
      recordsSkipped: recordsSkipped,
      parserVersion: "ff_no_v1",
      errorMessage: null,
      notes: `Parsed ${stations.length} stations, ${prices.length} price entries`
    });

    return Response.json({
      success: true,
      stationsFound: stations.length,
      pricesFound: prices.length,
      recordsCreated,
      recordsSkipped,
      fetchLogId: fetchLog.id
    });

  } catch (error) {
    const fetchLog = await base44.asServiceRole.entities.FetchLog.create({
      sourceName: "FuelFinder",
      startedAt: startedAt,
      finishedAt: new Date().toISOString(),
      success: false,
      httpStatus: null,
      recordsFound: 0,
      recordsCreated: 0,
      recordsSkipped: 0,
      parserVersion: "ff_no_v1",
      errorMessage: error.message,
      notes: null
    });

    return Response.json({ error: error.message, fetchLogId: fetchLog.id }, { status: 500 });
  }
});