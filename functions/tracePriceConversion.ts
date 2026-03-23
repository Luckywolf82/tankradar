import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * tracePriceConversion
 * 
 * Spores en konkret pris gjennom hele dataflyten:
 * 1. Rå Google API response (units + nanos)
 * 2. Parser-beregning
 * 3. Før FuelPrice lagring
 * 4. Lagret i database
 * 5. Dashboardet leser (rekonstruert fra logikk)
 */

// Eksakt samme parser som fetchGooglePlacesPrices (RIKTIG VERSJON)
function extractPriceNok(priceObj) {
  if (!priceObj || priceObj.currencyCode !== "NOK") return null;
  const units = priceObj.units || 0;    // øre (1/100 NOK)
  const nanos = priceObj.nanos || 0;    // 1e-9 øre (usually 0)
  const oreValue = units + (nanos / 1e9);
  return oreValue / 100;                 // convert øre to NOK
}

// Simulert Google API respons for ett konkret stasjon
const mockGoogleResponse = {
  place: {
    id: "test_oslo_uno_x",
    displayName: { text: "Uno-X Oslo Sentralstasjon" },
    formattedAddress: "Jernbanetorget 1, 0159 Oslo",
    location: { latitude: 59.9084, longitude: 10.7282 },
    fuelOptions: {
      fuelPrices: [
        {
          type: "SP95",
          price: {
            currencyCode: "NOK",
            units: 2196,  // 21.96 kr i øre
            nanos: 0
          },
          updateTime: "2026-03-06T14:30:00Z"
        }
      ]
    }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const googleFuelPrice = mockGoogleResponse.place.fuelOptions.fuelPrices[0];
    
    // STEG 1: Rå Google response
    const step1_rawGoogle = {
      type: googleFuelPrice.type,
      currencyCode: googleFuelPrice.price.currencyCode,
      units: googleFuelPrice.price.units,
      nanos: googleFuelPrice.price.nanos,
      updateTime: googleFuelPrice.updateTime,
      note: "units=2196 betyr 2196 øre (1/100 NOK) = 21.96 NOK"
    };

    // STEG 2: Parser-beregning
    const parserResult = extractPriceNok(googleFuelPrice.price);
    const step2_parserCalc = {
      formula: "units + (nanos / 1e9)",
      units: googleFuelPrice.price.units,
      nanos: googleFuelPrice.price.nanos,
      calculation: `${googleFuelPrice.price.units} + (${googleFuelPrice.price.nanos} / 1e9)`,
      result: parserResult,
      note: "Parser gir korrekt resultat: 21.96 NOK"
    };

    // STEG 3: Før lagring i FuelPrice (som skulle lagres)
    const step3_beforeStorage = {
      priceNok: parserResult,
      fuelType: "gasoline_95",
      stationId: "test_station_id",
      sourceName: "GooglePlaces",
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt: googleFuelPrice.updateTime,
      confidenceScore: 0.85,
      note: "Denne verdien skal lagres i database"
    };

    // STEG 4: Lagre i database (simulert)
    const storedRecord = await base44.entities.FuelPrice.create({
      stationId: step3_beforeStorage.stationId,
      fuelType: step3_beforeStorage.fuelType,
      priceNok: step3_beforeStorage.priceNok,
      priceType: "station_level",
      sourceName: step3_beforeStorage.sourceName,
      fetchedAt: step3_beforeStorage.fetchedAt,
      sourceUpdatedAt: step3_beforeStorage.sourceUpdatedAt,
      sourceFrequency: "near_realtime",
      confidenceScore: step3_beforeStorage.confidenceScore,
      parserVersion: "gp_v1",
      rawPayloadSnippet: `${step3_beforeStorage.fuelType} ${step3_beforeStorage.priceNok} NOK`
    });

    // STEG 5: Hent fra database og sjekk hva dashboardet leser
    const step5_fromDB = await base44.entities.FuelPrice.filter(
      { id: storedRecord.id },
      null,
      1
    );

    const readBack = step5_fromDB[0];

    return Response.json({
      diagnostic: "PRISSPORING GjenNOM HELE DATAFLYTEN",
      reportDate: new Date().toISOString(),
      
      concreteObservation: "Uno-X Oslo Sentralstasjon – Bensin 95",
      
      step1_rawGoogleResponse: step1_rawGoogle,
      
      step2_parserCalculation: step2_parserCalc,
      
      step3_beforeStorageInFuelPrice: step3_beforeStorage,
      
      step4_storedRecordId: storedRecord.id,
      
      step5_readBackFromDatabase: {
        id: readBack.id,
        stationId: readBack.stationId,
        fuelType: readBack.fuelType,
        priceNok: readBack.priceNok,
        sourceName: readBack.sourceName,
        fetchedAt: readBack.fetchedAt,
        sourceUpdatedAt: readBack.sourceUpdatedAt,
        confidenceScore: readBack.confidenceScore,
        parserVersion: readBack.parserVersion,
        note: "Denne verdien leses av dashboardet"
      },

      // Sjekk for 10x-multiplikasjon
      analysis: {
        parserOutput: parserResult,
        databaseStored: readBack.priceNok,
        dashboardReads: readBack.priceNok,
        ratio_database_vs_parser: readBack.priceNok / parserResult,
        ratio_10x_multiplier: readBack.priceNok === (parserResult * 10) ? "JA – 10x MULTIPLISERING FUNNET" : "NEI",
        expectedValue: "21.96 NOK (eller veldig nær dette)",
        actualValue: readBack.priceNok,
        correctnessStatus: Math.abs(readBack.priceNok - 21.96) < 0.1 ? "✓ KORREKT" : "✗ FEIL – 10X ELLER ANNEN MULTIPLIKASJON"
      },

      recommendation: readBack.priceNok === (parserResult * 10) 
        ? "10x multiplisering oppdaget. Sjekk: 1) FuelPrice-feltet 2) Dashboardet som leser priceNok 3) Evt. konvertering fra øre til kr"
        : "Annen feil oppdaget. Se analyse."
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});