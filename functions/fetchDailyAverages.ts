import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch drivstoffappen.no homepage and extract average prices
    const res = await fetch("https://www.drivstoffappen.no/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DrivstoffprisBot/1.0)"
      }
    });

    if (!res.ok) {
      return Response.json({ error: `Failed to fetch: ${res.status}` }, { status: 500 });
    }

    const html = await res.text();

    // Extract prices from the HTML
    // Pattern: number like 21.77 followed by "kr" and "95 Oktan" / "Diesel"
    const bensinMatch = html.match(/(\d+\.\d+)kr\s*[\s\S]{0,100}?95 Oktan/);
    const dieselMatch = html.match(/(\d+\.\d+)kr\s*[\s\S]{0,100}?Diesel/);

    // Try alternative patterns if needed
    let bensinPrice = null;
    let dieselPrice = null;

    if (bensinMatch) {
      bensinPrice = parseFloat(bensinMatch[1]);
    } else {
      // Try broader pattern
      const allPrices = html.match(/(\d{2}\.\d{2})kr/g);
      if (allPrices && allPrices.length >= 1) {
        bensinPrice = parseFloat(allPrices[0].replace("kr", ""));
      }
    }

    if (dieselMatch) {
      dieselPrice = parseFloat(dieselMatch[1]);
    } else {
      const allPrices = html.match(/(\d{2}\.\d{2})kr/g);
      if (allPrices && allPrices.length >= 2) {
        dieselPrice = parseFloat(allPrices[1].replace("kr", ""));
      }
    }

    // Sanity check
    if (!bensinPrice || !dieselPrice || bensinPrice < 10 || bensinPrice > 40 || dieselPrice < 10 || dieselPrice > 40) {
      // Try another pattern - look for prices in text nodes near "95 Oktan" and "Diesel"
      const priceBlocks = html.match(/(\d{2}\.\d{2})\s*kr[\s\S]{0,200}?(?:95 Oktan|Diesel)/g);
      if (priceBlocks) {
        for (const block of priceBlocks) {
          const m = block.match(/(\d{2}\.\d{2})/);
          if (!m) continue;
          const price = parseFloat(m[1]);
          if (block.includes("95 Oktan") && !bensinPrice) bensinPrice = price;
          if (block.includes("Diesel") && !dieselPrice) dieselPrice = price;
        }
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const results = [];

    if (bensinPrice && bensinPrice > 10 && bensinPrice < 40) {
      // Check if we already have today's entry
      const existing = await base44.asServiceRole.entities.FuelPrice.filter({
        fuel_type: "bensin_95",
        date_observed: today,
        station_chain: "Annet",
        city: "Norge (snitt)"
      });

      if (existing.length === 0) {
        const record = await base44.asServiceRole.entities.FuelPrice.create({
          price: bensinPrice,
          fuel_type: "bensin_95",
          station_name: "Landsgjennomsnitt",
          station_chain: "Annet",
          city: "Norge (snitt)",
          region: "Oslo og Akershus",
          date_observed: today,
          notes: "Automatisk hentet fra drivstoffappen.no",
          verified_count: 0
        });
        results.push({ type: "bensin_95", price: bensinPrice, created: true });
      } else {
        results.push({ type: "bensin_95", price: bensinPrice, created: false, reason: "Already exists today" });
      }
    }

    if (dieselPrice && dieselPrice > 10 && dieselPrice < 40) {
      const existing = await base44.asServiceRole.entities.FuelPrice.filter({
        fuel_type: "diesel",
        date_observed: today,
        station_chain: "Annet",
        city: "Norge (snitt)"
      });

      if (existing.length === 0) {
        const record = await base44.asServiceRole.entities.FuelPrice.create({
          price: dieselPrice,
          fuel_type: "diesel",
          station_name: "Landsgjennomsnitt",
          station_chain: "Annet",
          city: "Norge (snitt)",
          region: "Oslo og Akershus",
          date_observed: today,
          notes: "Automatisk hentet fra drivstoffappen.no",
          verified_count: 0
        });
        results.push({ type: "diesel", price: dieselPrice, created: true });
      } else {
        results.push({ type: "diesel", price: dieselPrice, created: false, reason: "Already exists today" });
      }
    }

    return Response.json({
      success: true,
      date: today,
      extracted: { bensin_95: bensinPrice, diesel: dieselPrice },
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});