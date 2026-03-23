import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Diagnostics: Shows raw Google price structure and current calculation method
 * to identify scaling error before correction
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch first 5 GooglePlaces prices
    const samplePrices = await base44.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-created_date",
      5
    );

    if (samplePrices.length === 0) {
      return Response.json({ message: "No GooglePlaces prices found" });
    }

    const diagnostics = {
      rawGoogleStructure: {
        description: "Google Places fuelOptions[].price structure from API",
        example: {
          type: "DIESEL or SP95",
          price: {
            currencyCode: "NOK",
            units: "21096",
            nanos: 0
          },
          updateTime: "2026-03-06T06:13:28Z"
        }
      },

      currentCalculation: {
        method: "extractPriceNok in fetchGooglePlacesPrices",
        code: `
function extractPriceNok(priceObj) {
  if (!priceObj || priceObj.currencyCode !== "NOK") return null;
  const units = priceObj.units || 0;
  const nanos = priceObj.nanos || 0;
  return units + (nanos / 1e9);  // LINE 65
}
        `,
        problem: "units from Google is in ØRE (hundredths of NOK), not NOK",
        example: {
          input: { units: 21096, nanos: 0, currencyCode: "NOK" },
          currentOutput: "21096 + (0 / 1e9) = 21096.00",
          shouldBe: "21096 ÷ 100 = 210.96 NOK"
        }
      },

      scalingError: {
        description: "Google returns: units = øre (1/100 NOK), nanos = fraction of øre",
        units: "units is in ØRE, not NOK",
        nanos: "nanos is 1e-9 of an ØRE (almost never used)",
        correction: "priceNok = units / 100 + nanos / 1e11"
      },

      correctCalculation: {
        code: `
function extractPriceNok(priceObj) {
  if (!priceObj || priceObj.currencyCode !== "NOK") return null;
  const units = priceObj.units || 0;        // ØRE
  const nanos = priceObj.nanos || 0;        // 1e-9 ØRE (rarely used)
  return (units / 100) + (nanos / 1e11);   // Convert to NOK
}
        `,
        examples: [
          { raw: { units: 21096, nanos: 0 }, calculated: 210.96, realistic: true },
          { raw: { units: 23023, nanos: 0 }, calculated: 230.23, realistic: true },
          { raw: { units: 22099, nanos: 0 }, calculated: 220.99, realistic: true }
        ]
      },

      affectedDatabase: {
        currentPrices: samplePrices.length,
        exampleOverscaledRecords: samplePrices.slice(0, 3).map(p => ({
          id: p.id,
          fuelType: p.fuelType,
          currentStoredValue: p.priceNok,
          shouldBe: (p.priceNok / 100).toFixed(2),
          error: `${(p.priceNok / 100).toFixed(2)} NOK (100x too high)`
        }))
      },

      nextSteps: [
        "1. Correct extractPriceNok function (divide units by 100)",
        "2. Delete all GooglePlaces prices from database",
        "3. Re-run fetchGooglePlacesPrices with corrected parser"
      ]
    };

    return Response.json(diagnostics);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});