import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SSB table 07020 - Priser på drivstoff ved bensinstasjoner
    const ssbUrl = "https://data.ssb.no/api/v0/no/table/07020";

    const query = {
      "query": [
        {
          "code": "Produkt",
          "selection": {
            "filter": "item",
            "values": ["Bensin, 95 oktan", "Autodiesel"]
          }
        },
        {
          "code": "Tid",
          "selection": {
            "filter": "top",
            "values": ["24"]
          }
        }
      ],
      "response": {
        "format": "json-stat2"
      }
    };

    const response = await fetch(ssbUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SSB API feil ${response.status}: ${errorBody}`);
    }

    const data = await response.json();

    // Parse JSON-stat2 format
    if (!data.dimension || !data.value) {
      throw new Error(`Invalid SSB response format: missing dimension or value`);
    }

    const dimensions = data.dimension;
    const values = data.value;
    
    if (!dimensions["Tid"] || !dimensions["Produkt"]) {
      throw new Error(`Invalid SSB dimensions: missing Tid or Produkt`);
    }

    const tidDim = dimensions["Tid"];
    const produktDim = dimensions["Produkt"];

    const tidLabels = tidDim.category.label;
    const tidIds = tidDim.category.index;
    const produktLabels = produktDim.category.label;
    const produktIds = produktDim.category.index;

    const nTid = Object.keys(tidIds).length;
    const nProdukt = Object.keys(produktIds).length;

    const records = [];

    for (const [tidKey, tidIdx] of Object.entries(tidIds)) {
      const tidLabel = tidLabels[tidKey]; // e.g. "2024M01"
      const yearStr = tidLabel.substring(0, 4);
      const monthStr = tidLabel.substring(5, 7);
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      for (const [prodKey, prodIdx] of Object.entries(produktIds)) {
        const prodLabel = produktLabels[prodKey];
        const valueIndex = tidIdx * nProdukt + prodIdx;
        const price = values[valueIndex];

        if (price !== null && price !== undefined) {
          const fuelType = prodLabel.toLowerCase().includes("bensin") ? "bensin" : "diesel";
          records.push({ year, month, fuel_type: fuelType, price, source: "SSB" });
        }
      }
    }

    // Store records in SSBData entity (as service role)
    const existingData = await base44.asServiceRole.entities.SSBData.list();
    const existingKeys = new Set(existingData.map(d => `${d.year}-${d.month}-${d.fuel_type}`));

    const newRecords = records.filter(r => !existingKeys.has(`${r.year}-${r.month}-${r.fuel_type}`));

    if (newRecords.length > 0) {
      await base44.asServiceRole.entities.SSBData.bulkCreate(newRecords);
    }

    return Response.json({
      success: true,
      fetched: records.length,
      new_records: newRecords.length,
      data: records
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});