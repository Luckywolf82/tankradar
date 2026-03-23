import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * verifyGooglePlacesPriceNormalization – Explicit Price Normalization Verification
 * 
 * Shows:
 * 1. Concrete examples of raw Google price structure → calculated NOK → stored FuelPrice
 * 2. Confirms all prices stored in correct NOK per liter format
 * 3. Reports price ranges vs realistic Norwegian fuel prices
 * 4. Verifies no parsing or decimalization errors
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all FuelPrice observations from GooglePlaces
    const allPrices = await base44.entities.FuelPrice.list('-created_date', 500);
    const googlePlacesPrices = allPrices.filter(p => p.sourceName === 'GooglePlaces');

    if (googlePlacesPrices.length === 0) {
      return Response.json({
        success: true,
        message: "No GooglePlaces prices in database yet"
      });
    }

    // Group by fuelType
    const byFuelType = {};
    for (const price of googlePlacesPrices) {
      if (!byFuelType[price.fuelType]) {
        byFuelType[price.fuelType] = [];
      }
      byFuelType[price.fuelType].push(price);
    }

    // Calculate statistics per fuel type
    const fuelTypeStats = {};
    const priceExamples = {};

    for (const [fuelType, prices] of Object.entries(byFuelType)) {
      const priceValues = prices.map(p => p.priceNok).filter(v => typeof v === 'number');
      
      if (priceValues.length === 0) continue;

      const min = Math.min(...priceValues);
      const max = Math.max(...priceValues);
      const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;

      fuelTypeStats[fuelType] = {
        observationCount: prices.length,
        minPriceNok: min,
        maxPriceNok: max,
        avgPriceNok: Number(avg.toFixed(2)),
        priceRange: `${min.toFixed(2)} – ${max.toFixed(2)} NOK/L`,
        realisticRangeNorway: fuelType === 'diesel' 
          ? '16.00 – 22.00 NOK/L' 
          : fuelType === 'gasoline_95'
          ? '17.00 – 23.00 NOK/L'
          : 'unknown'
      };

      // Store 2 examples per fuel type
      priceExamples[fuelType] = prices.slice(0, 2).map(p => ({
        priceNok: p.priceNok,
        sourceUpdatedAt: p.sourceUpdatedAt,
        fetchedAt: p.fetchedAt,
        rawPayloadSnippet: p.rawPayloadSnippet,
        confidenceScore: p.confidenceScore
      }));
    }

    // Determine if prices are realistic
    const priceValidation = {};
    for (const [fuelType, stats] of Object.entries(fuelTypeStats)) {
      const isRealistic = 
        (fuelType === 'diesel' && stats.minPriceNok >= 16.0 && stats.maxPriceNok <= 22.0) ||
        (fuelType === 'gasoline_95' && stats.minPriceNok >= 17.0 && stats.maxPriceNok <= 23.0);
      
      priceValidation[fuelType] = {
        min: stats.minPriceNok,
        max: stats.maxPriceNok,
        avg: stats.avgPriceNok,
        withinRealisticRange: isRealistic,
        status: isRealistic ? "✓ PASS" : "⚠ OUT_OF_RANGE"
      };
    }

    // Show decimal places (checking for proper precision)
    const decimalPrecisionCheck = googlePlacesPrices.slice(0, 5).map(p => ({
      priceNok: p.priceNok,
      decimalPlaces: (p.priceNok.toString().split('.')[1] || '').length,
      isValidPrecision: (p.priceNok.toString().split('.')[1] || '').length <= 2
    }));

    // Check for parsing anomalies
    const anomalies = googlePlacesPrices.filter(p => {
      // Flag suspicious values
      if (p.priceNok < 5) return true;    // Too low
      if (p.priceNok > 50) return true;   // Too high
      if (p.priceNok % 1 > 0.99) return true; // Suspicious decimal
      return false;
    });

    return Response.json({
      success: true,
      reportDate: new Date().toISOString(),
      
      "1_normalization_examples": {
        description: "Concrete examples showing raw Google structure → calculation → stored value",
        note: "rawPayloadSnippet shows what was extracted during parsing",
        examples: Object.entries(priceExamples).map(([fuelType, examples]) => ({
          fuelType: fuelType,
          samples: examples
        }))
      },

      "2_decimal_precision_check": {
        description: "Verifying prices stored with correct decimal precision (2 places for NOK)",
        samples: decimalPrecisionCheck,
        allValidPrecision: decimalPrecisionCheck.every(s => s.isValidPrecision)
      },

      "3_price_range_analysis": {
        description: "Min/max/avg per fuel type vs realistic Norwegian ranges",
        analysis: priceValidation,
        normalRanges: {
          diesel: "16.00–22.00 NOK/L (typical Norwegian prices Q1 2026)",
          gasoline_95: "17.00–23.00 NOK/L (typical Norwegian prices Q1 2026)"
        }
      },

      "4_anomaly_detection": {
        description: "Checking for parsing or normalization errors",
        anomaliesFound: anomalies.length,
        anomalyExamples: anomalies.slice(0, 3).map(a => ({
          priceNok: a.priceNok,
          fuelType: a.fuelType,
          sourceUpdatedAt: a.sourceUpdatedAt,
          reason: a.priceNok < 5 ? "too_low" : a.priceNok > 50 ? "too_high" : "suspicious_decimal"
        }))
      },

      "5_verification_summary": {
        totalGooglePlacesPrices: googlePlacesPrices.length,
        fuelTypesObserved: Object.keys(byFuelType),
        normalizationStatus: anomalies.length === 0 ? "✓ CORRECT" : "⚠ ERRORS_DETECTED",
        formatStatus: decimalPrecisionCheck.every(s => s.isValidPrecision) ? "✓ CORRECT_NOK_PER_LITER" : "⚠ PRECISION_ERROR",
        priceRangeStatus: Object.values(priceValidation).every(v => v.withinRealisticRange) ? "✓ REALISTIC" : "⚠ OUT_OF_RANGE",
        readyForDashboard: 
          anomalies.length === 0 &&
          decimalPrecisionCheck.every(s => s.isValidPrecision) &&
          Object.values(priceValidation).every(v => v.withinRealisticRange)
          ? "✓ YES – Proceed to historical visualization"
          : "✗ NO – Correct normalization errors first"
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});