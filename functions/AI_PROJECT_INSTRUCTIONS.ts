/**
 * AI PROJECT INSTRUCTIONS — TANKRADAR v1.0
 * 
 * Datert: 2026-03-09
 * Status: LOCKED IN PRODUCTION
 * 
 * Dette dokumentet formaliserer systemstruktur, datagovernance, og AI-agentrammer for TankRadar.
 * Det fungerer som:
 *   • Master prompt for Base44 AI-agent
 *   • Intern governance-dokument
 *   • Onboarding for nye utviklerchatter
 * 
 * ENDRINGER krever eksplisitt oppdatering av versjonsnummer og merknader.
 * 
 * ============================================================================
 * DEL 1: SYSTEMSTRUKTUR
 * ============================================================================
 */

// Station
// → Masterdata (sannhetskilde)
// → AI oppretter ALDRI direkte
// → Opprettelse skjer via StationReview + manuell kurering
// → Felt: name, chain, address, city, region, latitude, longitude, stationType

// FuelPrice
// → Prisdata fra kilder
// → Knyttet til Station via stationId (station_level) eller locationLabel (national_average)
// → reportedByUserId: settes når pris rapporteres av innlogget bruker; ellers null

// StationCandidate
// → Potensielle nye stasjoner fra eksterne kilder
// → Venter på matching/deduplisering

// StationReview
// → Review-/kurateringskø for station-mastering, klassifiseringsavvik, og manuelle
//   avklaringer innen eksisterende governance-typer.
// → IKKE en generell oppgave-bøtte for all mulig innhold
// → KRITISK REGEL: Nye review-typer skal ikke innføres uten eksplisitt
//   oppdatering av governance-dokumentene.

// ============================================================================
// DEL 2: DATAINTEGRITET
// ============================================================================

// REGEL 1: IKKE BLAND DATATYPER
// Systemet skiller alltid mellom:
//   • national_average, regional_average, station_level, station, user_reported
// Disse skal ALDRI presenteres som hadde samme granularitet.

// REGEL 2: INGEN STILLE FALLBACK
// Hvis en kilde feiler, skal det forklares eksplisitt som **KOMPROMISS:**
//   • Hva som feilet
//   • Hva som ble valgt i stedet
//   • Påvirkning på datakvalitet, granularitet, oppdateringsfrekvens

// REGEL 3: INGEN ANTAKELSER SOM FAKTA
// Ukjente verdier settes til null eller "unknown", ikke "beste gjett".

// REGEL 4: TOMTILSTAND > MISVISENDE DATA
// Hvis station_level-data mangler, vis tydelig tomtilstand.
// national_average skal ALDRI brukes som skjult erstatning.

// ============================================================================
// DEL 3: PERSONVERN OG IDENTITET
// ============================================================================

// ALIAS OG DISPLAY NAME:
//   • User.displayName lagres (hvis satt)
//   • Alias vises IKKE offentlig i MVP

// USER_REPORTED SPORBARHET:
//   • FuelPrice.reportedByUserId settes når pris rapporteres av innlogget bruker;
//     ellers null
//   • Brukes ALDRI til offentlig visning i MVP
//   • Grunnlag for fremtidig gamification (ikke implementert ennå)

// DELING:
//   • All offentlig deling av prisdata er anonym
//   • Bruker-identitet eksponeres ALDRI

// ============================================================================
// DEL 4: KILDEVALIDERING
// ============================================================================

// GYLDIGE INTEGRATIONSTATUS:
//   • planned, testing, parser_validated, live, blocked, deprecated

// KRITISK: Parser-validert ≠ Live
// En kilde merkes **live** BARE når ekte ekstern henting er bekreftet fra runtime.

// GYLDIGE DATAGRANULARITY:
//   • national_average, regional_average, station_level, station, user_reported, unknown

// FEILLAG SKAL IDENTIFISERES FØR LØSNING:
// dns_error, network_error, auth_error, http_error, parsing_error, mapping_error,
// persistence_error, dashboard_error, rendering_error

// ============================================================================
// DEL 5: AI-AGENTRAMMER
// ============================================================================

// REGEL 1: ÉN KRITISK ENDRING OM GANGEN
// Rekkefølge: 1. Datamodell 2. Kjent kilde 3. Dashboard 4. Ny kilde
// 5. Automations 6. Confidence-merging 7. Crowdsourcing

// REGEL 2: BE OM PREVIEW FØR APPLY (KRITISK)
// Når endring påvirker mange records eller sentrale pipelines:
//   • Be om preview/plan før apply
//   • Vis eksempler på hva som endres
//   • Få eksplisitt godkjenning før implementering
// Gjelder: bulk-klassifisering, matching-endringer, datamigrering, parser-config

// REGEL 3: RAPPORTERING ETTER HVERT STEG
// Etter hver større endring: hva fungerer, hva ikke, bekreftet felt, kompromisser, neste steg

// ============================================================================
// DEL 6: STATIONREVIEW-GOVERNANCE (KRITISK)
// ============================================================================

// STATIONREVIEW BRUKES TIL:
//   • Station-mastering (navn, chain, duplikat-slåing)
//   • Klassifiseringsavvik (innen eksisterende governance-typer)
//   • Manuelle avklaringer

// STATIONREVIEW BRUKES IKKE TIL:
//   • Generelle oppgaver
//   • Prisdata-problemer
//   • Bruker-relaterte oppgaver
//   • NYE WORKFLOW-TYPER UTEN GOVERNANCE-OPPDATERING

// ┌─────────────────────────────────────────────────────────────────┐
// │ KRITISK REGEL: NYE REVIEW-TYPER KREVER EKSPLISITT            │
// │ GOVERNANCE-OPPDATERING                                         │
// │                                                                 │
// │ Hvis ny review_type skal legges til:                          │
// │   1. Definer governance-regler for den                        │
// │   2. Oppdater AI_PROJECT_INSTRUCTIONS.js                      │
// │   3. Oppdater entity-schemat (StationReview.review_type enum)  │
// │   4. Implementer logikk                                        │
// │   5. Test med representativt datasett                         │
// │   6. Dokumenter resultat                                      │
// └─────────────────────────────────────────────────────────────────┘

// ============================================================================
// DEL 7: FROSSEN FILES (IKKE RØR DISSE)
// ============================================================================

// Sannhetskilde-filer:
//   • functions/classifyStationsRuleEngine.js
//   • functions/classifyGooglePlacesConfidence.js
//   • functions/classifyPricePlausibility.js

// Datamigrasjon/sletting:
//   • functions/deleteAllGooglePlacesPrices.js
//   • functions/deleteGooglePlacesPricesForReclassification.js
//   • functions/verifyGooglePlacesPriceNormalization.js

// Hvis bug oppstår: dokumenter, lag test-case, spør Base44 før endring.

// ============================================================================
// DEL 8: TESTVALIDITET
// ============================================================================

// REGEL 1: FIXTURES ≠ PRODUKSJON
// Fixtures brukes for parser, lagring, relasjoner, teknisk integrasjon.
// Match-rate/coverage evalueres ALDRI basert på fixtures.

// REGEL 2: TEST ≠ PRODUKSJON
// Eksplisitt rapporter: live kilder vs fixtures vs mockdata.
// Dekningstall fra blandede kilder presenteres ALDRI som reell ytelse.

// REGEL 3: FØR MATCHING-LOGIKK JUSTERES
// Bekreft: OSM-katalog representativ, kilder live, realistisk variasjon.
// Ellers: classifiser som test_environment_limited.

// ============================================================================
// DEL 9: PLAUSIBILITY OG DATAKVALITET
// ============================================================================

// ALLE PRISKILDER SKAL PASSERE PLAUSIBILITY CHECK
// Hvis pris utenfor realistisk intervall for Norge:
//   • Klassifiser som suspect
//   • Behandl IKKE som gyldig uten eksplisitt begrunnelse

// Realistisk intervall (2026):
//   • Bensin 95: 16 — 25 NOK/L
//   • Diesel: 15 — 24 NOK/L

// ============================================================================
// VERSJONHISTORIE
// ============================================================================

// v1.0 (2026-03-09) — INITIAL RELEASE
//   • Formalisert systemstruktur
//   • Fire mini-patches per feedback:
//     1. Nye review-typer krever eksplisitt governance-oppdatering
//     2. StationReview er for station-mastering/klassifiseringsavvik innen eksisterende typer
//     3. reportedByUserId settes når pris rapporteres av innlogget bruker; ellers null
//     4. AI skal be om preview/plan før apply når endringer påvirker mange records
//   • Konsistente filreferanser (.js)
//   • Låst for produksjon

export const AI_PROJECT_INSTRUCTIONS = {
  version: "1.0",
  dated: "2026-03-09",
  status: "LOCKED IN PRODUCTION",
  documentType: "AI GOVERNANCE + PROJECT INSTRUCTIONS",
  purpose: [
    "Master prompt for Base44 AI-agent",
    "Intern governance-dokument",
    "Onboarding for nye utviklerchatter"
  ]
};