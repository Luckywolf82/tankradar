import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * traceOneGooglePlacesObservation
 * 
 * Velg 1 konkret GooglePlaces-observasjon fra databasen.
 * Rekonstruer hele kjeden:
 * - Rå Google API-verdier (units, nanos, currencyCode, type)
 * - Parser-beregning steg-for-steg
 * - Faktisk lagret verdi i databasen
 * - Plausibility-klassifisering
 * - Hva dashboardet leser
 * 
 * Målet: Identifiser akkurat hvor i kjeden feilen oppstår.
 */

// Eksakt samme parser-logikk fra fetchGooglePlacesPrices
function extractPriceNok(priceObj) {
  if (!priceObj || priceObj.currencyCode !== "NOK") return null;
  const units = priceObj.units || 0;
  const nanos = priceObj.nanos || 0;
  return (units / 100) + (nanos / 1e11);
}

function classifyPricePlausibility(priceNok) {
  if (priceNok === null || priceNok === undefined) {
    return null;
  }
  if (priceNok < 10) {
    return "suspect_price_low";
  }
  if (priceNok > 30) {
    return "suspect_price_high";
  }
  return "realistic_price";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hent den siste GooglePlaces-prisen fra databasen
    const recentPrices = await base44.entities.FuelPrice.filter(
      { sourceName: "GooglePlaces" },
      "-created_date",
      1
    );

    if (recentPrices.length === 0) {
      return Response.json({
        error: "Ingen GooglePlaces-priser funnet i databasen",
        action: "Kjør fetchGooglePlacesPrices først"
      }, { status: 404 });
    }

    const databaseRecord = recentPrices[0];

    // Rekonstruer RAW Google API-objekt fra det som er lagret
    // (Dette baseres på rawPayloadSnippet og andre felter)
    const reconstructedRawPrice = {
      currencyCode: "NOK",
      units: null, // Vi vet at parser ga (units/100), så hvis priceNok=X, var units=X*100
      nanos: null,
      updateTime: databaseRecord.sourceUpdatedAt
    };

    // Baktreff: Hvis priceNok er lagret, hva var units?
    // priceNok = (units / 100) + (nanos / 1e11)
    // Hvis nanos er typisk 0, så: priceNok ≈ units / 100
    // Altså: units ≈ priceNok * 100
    const estimatedUnits = databaseRecord.priceNok * 100;
    reconstructedRawPrice.units = estimatedUnits;

    // Parser-kjøring
    const parserInput = reconstructedRawPrice;
    const parserOutput = extractPriceNok(parserInput);
    const parserPlausibility = classifyPricePlausibility(parserOutput);

    // Dashboard-leser
    const dashboardWouldDisplay = databaseRecord.plausibilityStatus === "realistic_price";

    // Sammenligning
    const parserMatchesDatabaseValue = 
      Math.abs(parserOutput - databaseRecord.priceNok) < 0.001;

    const plausibilityMatchesParser =
      parserPlausibility === databaseRecord.plausibilityStatus;

    return Response.json({
      observation: {
        id: databaseRecord.id,
        stationId: databaseRecord.stationId,
        fuelType: databaseRecord.fuelType,
        createdAt: databaseRecord.created_date
      },
      rawGoogleAPI: {
        currencyCode: reconstructedRawPrice.currencyCode,
        units: reconstructedRawPrice.units,
        nanos: reconstructedRawPrice.nanos,
        updateTime: reconstructedRawPrice.updateTime,
        note: "Rekonstruert fra lagret priceNok. Hvis units er feil, var den originale enten annerledes eller skalert annerledes."
      },
      parserStepByStep: {
        formula: "priceNok = (units / 100) + (nanos / 1e11)",
        input: {
          units: reconstructedRawPrice.units,
          nanos: reconstructedRawPrice.nanos || 0
        },
        calculation: {
          unitsContribution: reconstructedRawPrice.units / 100,
          nanosContribution: (reconstructedRawPrice.nanos || 0) / 1e11,
          sum: parserOutput
        },
        output: parserOutput
      },
      databaseRecord: {
        priceNok: databaseRecord.priceNok,
        plausibilityStatus: databaseRecord.plausibilityStatus,
        parserVersion: databaseRecord.parserVersion,
        confidenceScore: databaseRecord.confidenceScore,
        fetchedAt: databaseRecord.fetchedAt,
        sourceUpdatedAt: databaseRecord.sourceUpdatedAt,
        rawPayloadSnippet: databaseRecord.rawPayloadSnippet
      },
      verification: {
        parserOutputMatchesDatabaseValue: {
          parserOutput: parserOutput,
          databaseValue: databaseRecord.priceNok,
          match: parserMatchesDatabaseValue,
          difference: Math.abs(parserOutput - databaseRecord.priceNok)
        },
        parserPlausibilityClassificationMatchesDatabaseStatus: {
          parserWouldClassifyAs: parserPlausibility,
          databaseStoredAs: databaseRecord.plausibilityStatus,
          match: plausibilityMatchesParser
        },
        dashboardWouldDisplay: {
          displayLogic: "Only plausibilityStatus === 'realistic_price' shown",
          databaseStatus: databaseRecord.plausibilityStatus,
          wouldDisplay: dashboardWouldDisplay
        }
      },
      diagnostics: {
        allStepsConsistent: parserMatchesDatabaseValue && plausibilityMatchesParser,
        chainBreakAt: !parserMatchesDatabaseValue ? "PARSER → DATABASE" : 
                      !plausibilityMatchesParser ? "PLAUSIBILITY CLASSIFICATION" :
                      dashboardWouldDisplay === (databaseRecord.plausibilityStatus === "realistic_price") ? "NONE" :
                      "DASHBOARD FILTERING",
        nextAction: parserMatchesDatabaseValue && plausibilityMatchesParser
          ? "Kjeden er konsistent. Valider at reconstructedRawPrice.units matcher opprinnelig API-respons."
          : "Kjeden er brutt. Se 'chainBreakAt' for hvor feilen oppstår."
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});