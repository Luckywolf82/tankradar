/*
 * ════════════════════════════════════════════════════════════════════════
 * AI PROJECT INSTRUCTIONS — TANKRADAR v1.0
 * ════════════════════════════════════════════════════════════════════════
 *
 * Datert: 2026-03-09
 * Status: LOCKED IN PRODUCTION
 *
 * Dette dokumentet formaliserer systemstruktur, datagovernance, og AI-agentrammer.
 * Funksjoner som: Master prompt, Intern governance, Onboarding
 *
 * ════════════════════════════════════════════════════════════════════════
 * DEL 1: SYSTEMSTRUKTUR
 * ════════════════════════════════════════════════════════════════════════
 *
 * STATION (Masterdata)
 *   ✗ AI oppretter ALDRI direkte
 *   → Opprettelse via StationReview + manuell kurering
 *   → Felt: name, chain, address, city, region, latitude, longitude, stationType
 *
 * FUELPRICE (Prisdata)
 *   → Må inneholde: sourceName, sourceUrl, fetchedAt, sourceUpdatedAt,
 *     sourceFrequency, parserVersion, confidenceScore, priceType
 *   → reportedByUserId: settes når pris rapporteres av innlogget bruker; ELLERS NULL
 *
 * STATIONCANDIDATE (Potensielle stasjoner)
 *   → Fra eksterne kilder (GooglePlaces, OSM, user reports)
 *   → Venter på matching/deduplisering
 *
 * STATIONREVIEW (Review-kø)
 *   → BRUKES TIL: station-mastering, klassifiseringsavvik, manuelle avklaringer
 *     INNEN EKSISTERENDE GOVERNANCE-TYPER
 *   → BRUKES IKKE TIL: generelle oppgaver, prisdata-problemer, nye workflow-typer
 *   → Gyldige review_type: legacy_duplicate, chain_unconfirmed, generic_name_review,
 *     seed_conflict, possible_foreign_station, duplicate_candidate,
 *     specialty_fuel_review, non_fuel_poi_review
 *
 * SOURCEREGI STRY (Kilderegister)
 *   → Sannhetskilde for kildehelse
 *   → Dashboard og rapportering leser fra denne
 *
 * ════════════════════════════════════════════════════════════════════════
 * DEL 2: DATAINTEGRITET (4 MAIN RULES)
 * ════════════════════════════════════════════════════════════════════════
 *
 * REGEL 1: IKKE BLAND DATATYPER
 *   Skiller alltid: national_average, regional_average, station_level, station, user_reported
 *   → ALDRI presenteres som hadde samme granularitet
 *
 * REGEL 2: INGEN STILLE FALLBACK
 *   Hvis kilde feiler → ALLTID forklart som **KOMPROMISS:**
 *   • Hva som feilet
 *   • Hva som ble valgt i stedet
 *   • Påvirkning: datakvalitet, granularitet, oppdateringsfrekvens
 *
 * REGEL 3: INGEN ANTAKELSER SOM FAKTA
 *   Ukjente verdier → null eller "unknown" (IKKE beste gjett)
 *
 * REGEL 4: TOMTILSTAND > MISVISENDE DATA
 *   Hvis station_level mangler → vis tydelig tomtilstand
 *   national_average ALDRI som skjult erstatning
 *
 * ════════════════════════════════════════════════════════════════════════
 * DEL 3: PERSONVERN OG IDENTITET
 * ════════════════════════════════════════════════════════════════════════
 *
 * ALIAS OG DISPLAY NAME:
 *   • User.displayName lagres (hvis satt)
 *   • Alias vises IKKE offentlig i MVP
 *
 * USER_REPORTED SPORBARHET:
 *   • FuelPrice.reportedByUserId settes når pris rapporteres av innlogget bruker;
 *     ellers null
 *   • ALDRI til offentlig visning i MVP
 *   • Grunnlag for fremtidig gamification (ikke implementert)
 *
 * DELING:
 *   • ALL offentlig deling = anonym
 *   • Bruker-identitet eksponeres ALDRI
 *
 * ════════════════════════════════════════════════════════════════════════
 * DEL 4: KILDEVALIDERING
 * ════════════════════════════════════════════════════════════════════════
 *
 * GYLDIGE INTEGRATIONSTATUS:
 *   planned, testing, parser_validated, live, blocked, deprecated
 *
 * KRITISK: Parser-validert ≠ Live
 *   → live BARE når ekstern henting bekreftet fra runtime
 *   → parser_validated = fixture-testet, ikke live
 *
 * GYLDIGE DATAGRANULARITY:
 *   national_average, regional_average, station_level, station, user_reported, unknown
 *
 * FEILLAG-IDENTIFIKASJON (før løsning):
 *   dns_error, network_error, auth_error, http_error, parsing_error,
 *   mapping_error, persistence_error, dashboard_error, rendering_error
 *
 * ════════════════════════════════════════════════════════════════════════
 * DEL 5: AI-AGENTRAMMER
 * ════════════════════════════════════════════════════════════════════════
 *
 * REGEL 1: ÉN KRITISK ENDRING OM GANGEN
 *   Rekkefølge: 1. Datamodell → 2. Kilde → 3. Dashboard → 4. NY kilde
 *               5. Automations → 6. Merging → 7. Crowdsourcing
 *
 * REGEL 2: BE OM PREVIEW FØR APPLY (KRITISK)
 *   Når endring påvirker mange records eller sentrale pipelines:
 *   • Be om preview/plan
 *   • Vis eksempler
 *   • Få eksplisitt godkjenning
 *
 *   Gjelder: bulk-klassifisering, matching-endringer, datamigrering, parser-config
 *
 * REGEL 3: RAPPORTERING ETTER STEG
 *   Hva fungerer, hva ikke, bekreftet felt, kompromisser, neste steg
 *
 * ════════════════════════════════════════════════════════════════════════
 * DEL 6: STATIONREVIEW-GOVERNANCE (KRITISK!)
 * ════════════════════════════════════════════════════════════════════════
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │                                                                      │
 * │ NYE REVIEW-TYPER SKAL IKKE INNFØRES UTEN EKSPLISITT               │
 * │ OPPDATERING AV GOVERNANCE-DOKUMENTENE                              │
 * │                                                                      │
 * │ Hvis ny review_type skal legges til:                              │
 * │   1. Definer governance-regler                                    │
 * │   2. Oppdater PROJECT_INSTRUCTIONS_v1.js                          │
 * │   3. Oppdater entity-schemat (StationReview.review_type enum)      │
 * │   4. Implementer logikk                                           │
 * │   5. Test med representativt datasett                            │
 * │   6. Dokumenter resultat                                         │
 * │                                                                      │
 * │ INGEN UNNTAK — Dette er ikke åpent for fortolking.               │
 * │                                                                      │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * ════════════════════════════════════════════════════════════════════════
 * DEL 7: FROSSEN FILES (IKKE RØR DISSE)
 * ════════════════════════════════════════════════════════════════════════
 *
 * Sannhetskilde-filer:
 *   • functions/classifyStationsRuleEngine.js
 *   • functions/classifyGooglePlacesConfidence.js
 *   • functions/classifyPricePlausibility.js
 *
 * Datamigrasjon/sletting:
 *   • functions/deleteAllGooglePlacesPrices.js
 *   • functions/deleteGooglePlacesPricesForReclassification.js
 *   • functions/verifyGooglePlacesPriceNormalization.js
 *
 * Hvis bug: dokumenter → lag test-case → spør Base44 før endring
 *
 * ════════════════════════════════════════════════════════════════════════
 * DEL 8: TESTVALIDITET
 * ════════════════════════════════════════════════════════════════════════
 *
 * REGEL 1: FIXTURES ≠ PRODUKSJON
 *   Fixtures brukes for: parser, lagring, relasjoner, teknisk integrasjon
 *   Match-rate/coverage evalueres ALDRI basert på fixtures
 *
 * REGEL 2: TEST ≠ PRODUKSJON
 *   Rapporter eksplisitt: live kilder vs fixtures vs mockdata
 *   Dekningstall fra blandede kilder ALDRI som reell ytelse
 *
 * REGEL 3: FØR MATCHING-LOGIKK JUSTERES
 *   Bekreft: OSM-katalog representativ, kilder live, realistisk variasjon
 *   Ellers: classifiser som test_environment_limited
 *
 * ════════════════════════════════════════════════════════════════════════
 * DEL 9: PLAUSIBILITY OG DATAKVALITET
 * ════════════════════════════════════════════════════════════════════════
 *
 * ALLE PRISKILDER SKAL PASSERE PLAUSIBILITY CHECK
 *
 * Hvis pris utenfor realistisk intervall:
 *   • Klassifiser som suspect
 *   • IKKE behandl som gyldig uten eksplisitt begrunnelse
 *
 * Realistisk intervall (Norge 2026):
 *   • Bensin 95: 16 — 25 NOK/L
 *   • Diesel: 15 — 24 NOK/L
 *
 * ════════════════════════════════════════════════════════════════════════
 * VERSJONHISTORIE
 * ════════════════════════════════════════════════════════════════════════
 *
 * v1.0 (2026-03-09) — INITIAL RELEASE
 *   ✓ Formalisert systemstruktur
 *   ✓ Fire mini-patches per feedback:
 *       1. Nye review-typer krever eksplisitt governance-oppdatering
 *       2. StationReview er for station-mastering/klassifiseringsavvik
 *          innen eksisterende governance-typer
 *       3. reportedByUserId settes når pris rapporteres av innlogget bruker;
 *          ellers null
 *       4. AI skal be om preview/plan før apply når endringer påvirker
 *          mange records eller sentrale pipelines
 *   ✓ Konsistente filreferanser (.js)
 *   ✓ Låst for produksjon
 *
 * ════════════════════════════════════════════════════════════════════════
 */

// Export for reference (non-executable)
const PROJECT_INSTRUCTIONS_v1 = {
  version: "1.0",
  dated: "2026-03-09",
  status: "LOCKED IN PRODUCTION",
  documentType: "AI GOVERNANCE + PROJECT INSTRUCTIONS",
  purpose: [
    "Master prompt for Base44 AI-agent",
    "Intern governance-dokument",
    "Onboarding for nye utviklerchatter"
  ],
  fourKeyPatches: [
    "Nye review-typer krever eksplisitt governance-oppdatering",
    "StationReview er for station-mastering/klassifiseringsavvik innen eksisterende typer",
    "reportedByUserId settes når pris rapporteres av innlogget bruker; ellers null",
    "AI skal be om preview/plan før apply når endringer påvirker mange records"
  ]
};

console.log("✓ PROJECT_INSTRUCTIONS_v1.0 loaded — dokumentet er låst for produksjon");