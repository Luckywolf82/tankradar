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
  // Pattern: Current price ... (number) ... Percent change
  // Find the NOK price table - look for the price in the "Current price" row
  const match = html.match(/Current price<\/td>\s*<td[^>]*align="center">(\d+\.\d+)<\/td>/);
  if (match) return parseFloat(match[1]);

  // Fallback: find NOK X.XX per liter in the text
  const textMatch = html.match(/NOK (\d+\.\d+) per liter/);
  if (textMatch) return parseFloat(textMatch[1]);

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().split("T")[0];

    const [bensin95, diesel] = await Promise.all([
      fetchNokPrice("https://www.globalpetrolprices.com/Norway/gasoline_prices/"),
      fetchNokPrice("https://www.globalpetrolprices.com/Norway/diesel_prices/")
    ]);

    if (!bensin95 || !diesel) {
      return Response.json({ error: "Could not extract prices", bensin95, diesel }, { status: 500 });
    }

    const results = [];

    // Save bensin_95
    const existingBensin = await base44.asServiceRole.entities.FuelPrice.filter({
      fuel_type: "bensin_95",
      date_observed: today,
      city: "Norge (snitt)"
    });

    if (existingBensin.length === 0) {
      await base44.asServiceRole.entities.FuelPrice.create({
        price: bensin95,
        fuel_type: "bensin_95",
        station_name: "Landsgjennomsnitt",
        station_chain: "Annet",
        city: "Norge (snitt)",
        region: "Oslo og Akershus",
        date_observed: today,
        notes: "Auto-hentet fra globalpetrolprices.com (uke-oppdatert)",
        verified_count: 0
      });
      results.push({ type: "bensin_95", price: bensin95, action: "created" });
    } else {
      results.push({ type: "bensin_95", price: bensin95, action: "already_exists" });
    }

    // Save diesel
    const existingDiesel = await base44.asServiceRole.entities.FuelPrice.filter({
      fuel_type: "diesel",
      date_observed: today,
      city: "Norge (snitt)"
    });

    if (existingDiesel.length === 0) {
      await base44.asServiceRole.entities.FuelPrice.create({
        price: diesel,
        fuel_type: "diesel",
        station_name: "Landsgjennomsnitt",
        station_chain: "Annet",
        city: "Norge (snitt)",
        region: "Oslo og Akershus",
        date_observed: today,
        notes: "Auto-hentet fra globalpetrolprices.com (uke-oppdatert)",
        verified_count: 0
      });
      results.push({ type: "diesel", price: diesel, action: "created" });
    } else {
      results.push({ type: "diesel", price: diesel, action: "already_exists" });
    }

    return Response.json({ success: true, date: today, extracted: { bensin95, diesel }, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});