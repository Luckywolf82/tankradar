import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Step 1: Get a session token from DrivstoffAppen API
    const tokenRes = await fetch("https://api.drivstoffappen.no/api/v1/authorization-sessions", {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" }
    });
    const tokenData = await tokenRes.json();
    const token = tokenData?.token;

    if (!token) {
      return Response.json({ error: "Could not get auth token", tokenData }, { status: 500 });
    }

    // Step 2: Fetch stations near Oslo with the token
    const stationsRes = await fetch(
      "https://api.drivstoffappen.no/api/v1/stations?stationTypeId=1&lat=59.9139&lon=10.7522&radius=50",
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "User-Agent": "Mozilla/5.0 (compatible)"
        }
      }
    );

    const stationsText = await stationsRes.text();
    let stations;
    try {
      stations = JSON.parse(stationsText);
    } catch {
      return Response.json({ error: "Failed to parse stations", raw: stationsText.slice(0, 500) }, { status: 500 });
    }

    return Response.json({ token, stations: Array.isArray(stations) ? stations.slice(0, 3) : stations });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});