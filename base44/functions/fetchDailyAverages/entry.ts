import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Scrape NOK price from globalpetrolprices.com for Norway
async function fetchNokPrice(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
      "Accept": "text/html"
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const html = await res.text();

  // The "Current price" row in the table shows NOK value
  const match = html.match(/Current price<\/td>\s*<td[^>]*align="center">(\d+\.\d+)<\/td>/);
  if (match) return parseFloat(match[1]);

  // Fallback: find NOK X.XX per liter in the text
  const textMatch = html.match(/NOK (\d+\.\d+) per liter/);
  if (textMatch) return parseFloat(textMatch[1]);

  return null;
}

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().split("T")[0];
    const fetchedAt = new Date().toISOString();

    const [bensin95, diesel] = await Promise.all([
      fetchNokPrice("https://www.globalpetrolprices.com/Norway/gasoline_prices/"),
      fetchNokPrice("https://www.globalpetrolprices.com/Norway/diesel_prices/")
    ]);

    if (!bensin95 || !diesel) {
      const fetchLog = await base44.asServiceRole.entities.FetchLog.create({
        sourceName: "GlobalPetrolPrices",
        startedAt: startedAt,
        finishedAt: new Date().toISOString(),
        success: false,
        httpStatus: 200,
        recordsFound: 0,
        recordsCreated: 0,
        recordsSkipped: 0,
        parserVersion: "gpp_no_v2",
        errorMessage: `Could not extract prices. bensin95=${bensin95}, diesel=${diesel}`,
        notes: null
      });
      
      return Response.json({ 
        error: "Could not extract prices", 
        bensin95, 
        diesel,
        fetchLogId: fetchLog.id
      }, { status: 500 });
    }

    let recordsCreated = 0;
    let recordsSkipped = 0;

    // Save bensin_95
    const existingBensin = await base44.asServiceRole.entities.FuelPrice.filter({
      fuelType: "gasoline_95",
      locationLabel: "Norge (snitt)",
      sourceName: "GlobalPetrolPrices",
      sourceUpdatedAt: today
    });

    if (existingBensin.length === 0) {
      await base44.asServiceRole.entities.FuelPrice.create({
        locationLabel: "Norge (snitt)",
        fuelType: "gasoline_95",
        priceNok: bensin95,
        priceType: "national_average",
        sourceName: "GlobalPetrolPrices",
        sourceUrl: "https://www.globalpetrolprices.com/Norway/gasoline_prices/",
        sourceUpdatedAt: today,
        fetchedAt: fetchedAt,
        sourceFrequency: "weekly",
        confidenceScore: 0.7,
        parserVersion: "gpp_no_v2",
        rawPayloadSnippet: `bensin_95: ${bensin95} NOK/L`
      });
      recordsCreated++;
    } else {
      recordsSkipped++;
    }

    // Save diesel
    const existingDiesel = await base44.asServiceRole.entities.FuelPrice.filter({
      fuelType: "diesel",
      locationLabel: "Norge (snitt)",
      sourceName: "GlobalPetrolPrices",
      sourceUpdatedAt: today
    });

    if (existingDiesel.length === 0) {
      await base44.asServiceRole.entities.FuelPrice.create({
        locationLabel: "Norge (snitt)",
        fuelType: "diesel",
        priceNok: diesel,
        priceType: "national_average",
        sourceName: "GlobalPetrolPrices",
        sourceUrl: "https://www.globalpetrolprices.com/Norway/diesel_prices/",
        sourceUpdatedAt: today,
        fetchedAt: fetchedAt,
        sourceFrequency: "weekly",
        confidenceScore: 0.7,
        parserVersion: "gpp_no_v2",
        rawPayloadSnippet: `diesel: ${diesel} NOK/L`
      });
      recordsCreated++;
    } else {
      recordsSkipped++;
    }

    // Log the fetch
    const fetchLog = await base44.asServiceRole.entities.FetchLog.create({
      sourceName: "GlobalPetrolPrices",
      startedAt: startedAt,
      finishedAt: new Date().toISOString(),
      success: true,
      httpStatus: 200,
      recordsFound: 2,
      recordsCreated: recordsCreated,
      recordsSkipped: recordsSkipped,
      parserVersion: "gpp_no_v2",
      errorMessage: null,
      notes: `sourceUpdatedAt: ${today}, confidenceScore: 0.7`
    });

    return Response.json({ 
      success: true, 
      sourceUpdatedAt: today,
      extracted: { bensin95, diesel }, 
      recordsCreated,
      recordsSkipped,
      fetchLogId: fetchLog.id
    });

  } catch (error) {
    const fetchLog = await base44.asServiceRole.entities.FetchLog.create({
      sourceName: "GlobalPetrolPrices",
      startedAt: startedAt,
      finishedAt: new Date().toISOString(),
      success: false,
      httpStatus: null,
      recordsFound: 0,
      recordsCreated: 0,
      recordsSkipped: 0,
      parserVersion: "gpp_no_v2",
      errorMessage: error.message,
      notes: null
    });

    return Response.json({ error: error.message, fetchLogId: fetchLog.id }, { status: 500 });
  }
});