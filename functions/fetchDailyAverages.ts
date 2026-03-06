import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Helper to scrape national average prices from drivstoffappen.no website
async function scrapeNationalAverages() {
  const res = await fetch("https://www.drivstoffappen.no/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "no,en;q=0.9"
    }
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // The page shows: "21.77kr\n95 Oktan\n22.66kr\nDiesel"
  // Pattern: find all decimal numbers that look like fuel prices (15-30 kr range)
  const priceMatches = [...html.matchAll(/(\d{2}\.\d{2})kr/g)];
  const prices = priceMatches.map(m => parseFloat(m[1])).filter(p => p >= 15 && p <= 35);

  // Also try to find labels near prices
  const bensinMatch = html.match(/(1[5-9]|2[0-9])\.\d{2}(?=kr[\s\S]{0,200}?95\s*Oktan)/);
  const dieselMatch = html.match(/(1[5-9]|2[0-9])\.\d{2}(?=kr[\s\S]{0,200}?Diesel)/);

  let bensin95 = bensinMatch ? parseFloat(bensinMatch[0]) : null;
  let diesel = dieselMatch ? parseFloat(dieselMatch[0]) : null;

  // Fallback: assume first two valid prices are bensin95 and diesel
  if (!bensin95 && prices.length >= 1) bensin95 = prices[0];
  if (!diesel && prices.length >= 2) diesel = prices[1];

  return { bensin95, diesel, allFound: prices };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().split("T")[0];

    const { bensin95, diesel, allFound } = await scrapeNationalAverages();

    if (!bensin95 || !diesel) {
      return Response.json({
        error: "Could not extract prices from website",
        allFound
      }, { status: 500 });
    }

    const results = [];

    // Upsert bensin_95 national average
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
        notes: "Auto-hentet fra drivstoffappen.no",
        verified_count: 0
      });
      results.push({ type: "bensin_95", price: bensin95, action: "created" });
    } else {
      results.push({ type: "bensin_95", price: bensin95, action: "already_exists" });
    }

    // Upsert diesel national average
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
        notes: "Auto-hentet fra drivstoffappen.no",
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