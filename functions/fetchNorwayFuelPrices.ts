import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ANWB_BASE_URL = "https://api.anwb.nl/v1";
const ANWB_API_KEY = "GNYXLHxCa14zfA1nVJkVV8ldQZHbPTcu";

// Grid boxes covering Norway (sw_lat, sw_lon, ne_lat, ne_lon)
const NORWAY_BOXES = [
  // Sør-Norge
  [57.9, 4.5, 59.5, 7.5],
  [57.9, 7.5, 59.5, 10.5],
  [57.9, 10.5, 59.5, 13.0],
  [59.5, 4.5, 61.0, 7.5],
  [59.5, 7.5, 61.0, 10.5],
  [59.5, 10.5, 61.0, 13.0],
  // Vestlandet / Midt-Norge
  [61.0, 4.5, 62.5, 7.5],
  [61.0, 7.5, 62.5, 10.5],
  [61.0, 10.5, 62.5, 13.0],
  [62.5, 6.0, 64.0, 9.0],
  [62.5, 9.0, 64.0, 12.0],
  [62.5, 12.0, 64.0, 15.0],
  // Trøndelag
  [64.0, 9.0, 65.5, 12.0],
  [64.0, 12.0, 65.5, 15.0],
  // Nord-Norge
  [65.5, 11.0, 67.0, 14.0],
  [65.5, 14.0, 67.0, 17.0],
  [67.0, 13.0, 68.5, 16.0],
  [67.0, 16.0, 68.5, 19.0],
  [68.5, 15.0, 70.0, 18.0],
  [68.5, 18.0, 70.0, 21.0],
  [70.0, 20.0, 71.5, 25.0],
  [70.0, 25.0, 71.5, 30.0],
];

// Map ANWB fuel type names to our entity enum values
function mapFuelType(anwbType) {
  const t = (anwbType || "").toLowerCase();
  if (t.includes("euro95") || t.includes("95") || t.includes("bensin")) return "bensin_95";
  if (t.includes("98") || t.includes("super plus")) return "bensin_98";
  if (t.includes("diesel") && (t.includes("premium") || t.includes("plus"))) return "diesel_premium";
  if (t.includes("diesel")) return "diesel";
  return null;
}

// Map station name to known chain
function mapChain(name) {
  if (!name) return "Annet";
  const n = name.toLowerCase();
  if (n.includes("circle k") || n.includes("circlek")) return "Circle K";
  if (n.includes("uno-x") || n.includes("uno x") || n.includes("unox")) return "Uno-X";
  if (n.includes("esso")) return "Esso";
  if (n.includes("shell")) return "Shell";
  if (n.includes("yx")) return "YX";
  if (n.includes("best")) return "Best";
  return "Annet";
}

// Map Norwegian region based on latitude/longitude
function mapRegion(lat, lon) {
  if (lat >= 70.0) return "Finnmark";
  if (lat >= 68.5) return "Troms";
  if (lat >= 65.5) return "Nordland";
  if (lat >= 64.0) return "Trøndelag";
  if (lat >= 62.5) return "Møre og Romsdal";
  if (lat >= 61.0) return "Vestland";
  if (lat >= 59.5 && lon < 7.0) return "Rogaland";
  if (lat >= 59.5 && lon >= 7.0 && lon < 9.5) return "Agder";
  if (lat >= 59.5 && lon >= 9.5 && lon < 11.0) return "Vestfold og Telemark";
  if (lat >= 59.5) return "Viken";
  if (lat >= 59.0 && lon >= 10.0) return "Oslo og Akershus";
  if (lat >= 58.0) return "Agder";
  return "Innlandet";
}

async function fetchBox(sw, ne) {
  const url = `${ANWB_BASE_URL}/fuel/stations?sw=${sw[0]},${sw[1]}&ne=${ne[0]},${ne[1]}`;
  const res = await fetch(url, {
    headers: { "apiKey": ANWB_API_KEY }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no user) and admin manual trigger
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === "admin";
    } catch (_) {
      // Called from automation (no user session) – allow
      isAdmin = true;
    }

    if (!isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date().toISOString().split("T")[0];
    let totalSaved = 0;
    let totalSkipped = 0;
    const seen = new Set();

    for (const [swLat, swLon, neLat, neLon] of NORWAY_BOXES) {
      const stations = await fetchBox([swLat, swLon], [neLat, neLon]);

      for (const station of stations) {
        const stationName = station.name || station.description || "Ukjent";
        const chain = mapChain(stationName);
        const lat = station.location?.latitude;
        const lon = station.location?.longitude;
        const city = station.location?.city || station.location?.place || "Ukjent";
        const region = (lat && lon) ? mapRegion(lat, lon) : "Innlandet";

        const fuels = station.fuels || [];
        for (const fuel of fuels) {
          const fuelType = mapFuelType(fuel.type);
          if (!fuelType) continue;

          const price = fuel.priceInformation?.price;
          if (!price || price < 10 || price > 40) continue; // sanity check

          const dedupeKey = `${stationName}|${fuelType}|${today}`;
          if (seen.has(dedupeKey)) {
            totalSkipped++;
            continue;
          }
          seen.add(dedupeKey);

          await base44.asServiceRole.entities.FuelPrice.create({
            price: parseFloat(price.toFixed(2)),
            fuel_type: fuelType,
            station_name: stationName,
            station_chain: chain,
            city: city,
            region: region,
            date_observed: today,
            notes: "Auto-hentet fra ANWB Onderweg",
            verified_count: 0
          });

          totalSaved++;
        }
      }

      // Small delay to be nice to the API
      await new Promise(r => setTimeout(r, 200));
    }

    return Response.json({
      success: true,
      date: today,
      saved: totalSaved,
      skipped: totalSkipped
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});