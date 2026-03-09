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
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEL 1: SYSTEMSTRUKTUR
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * SENTRALE ENTITETER OG ROLLER:
 * 
 * Station
 *   → Masterdata (sannhetskilde)
 *   → AI oppretter ALDRI direkte
 *   → Opprettelse skjer via StationReview + manuell kurering
 *   → Felt: name, chain, address, city, region, latitude, longitude, stationType
 * 
 * FuelPrice
 *   → Prisdata fra kilder
 *   → Knyttet til Station via stationId (station_level) eller locationLabel (national_average)
 *   → Må inneholde: sourceName, sourceUrl, fetchedAt, sourceUpdatedAt, sourceFrequency,
 *     parserVersion, confidenceScore, priceType
 *   → reportedByUserId: settes når pris rapporteres av innlogget bruker; ellers null
 * 
 * StationCandidate
 *   → Potensielle nye stasjoner fra eksterne kilder (GooglePlaces, OSM, user reports)
 *   → Venter på matching/deduplisering
 *   → Status: pending, auto_confirmed, approved, rejected, duplicate
 * 
 * StationReview
 *   → Review-/kurateringskø for station-mastering, klassifiseringsavvik, og manuelle
 *     avklaringer innen eksisterende governance-typer.
 *   → IKKE en generell oppgave-bøtte for all mulig innhold
 *   → Gyldige review_type: legacy_duplicate, chain_unconfirmed, generic_name_review,
 *     seed_conflict, possible_foreign_station, duplicate_candidate, specialty_fuel_review,
 *     non_fuel_poi_review
 * 
 * SourceRegistry
 *   → Sannhetskilde for kildehelse
 *   → Dashboard og rapportering leser fra denne
 *   → Felter: sourceName, integrationStatus, sourceType, dataGranularity, updateFrequency,
 *     lastSuccessAt, lastFailureAt, failureReason, notes
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEL 2: DATAINTEGRITET
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * REGEL 1: IKKE BLAND DATATYPER
 * 
 * Systemet skiller alltid mellom:
 *   • national_average
 *   • regional_average
 *   • station_level
 *   • station (katalogdata uten priser)
 *   • user_reported
 * 
 * Disse skal ALDRI presenteres som hadde samme granularitet eller kvalitet.
 * Dashboard må vise eksplisitt hvilken type hver datasett er.
 */

/**
 * REGEL 2: INGEN STILLE FALLBACK
 * 
 * Hvis en kilde feiler, blokkeres eller erstattes, skal dette ALLTID forklares
 * eksplisitt før videre implementering.
 * 
 * Alle kompromisser skal merkes med **KOMPROMISS:** og inneholde:
 *   • Hva som feilet
 *   • Hva som ble valgt i stedet
 *   • Hvordan dette påvirker datakvalitet
 *   • Hvordan dette påvirker granularitet
 *   • Hvordan dette påvirker oppdateringsfrekvens
 */

/**
 * REGEL 3: INGEN ANTAKELSER SOM FAKTA
 * 
 * Hvis et felt ikke er eksplisitt hentet fra kilden, skal det IKKE fylles inn
 * som om det er bekreftet.
 * 
 * Ukjente verdier skal settes til null eller "unknown".
 * Dette gjelder særlig:
 *   • sourceUpdatedAt
 *   • sourceFrequency
 *   • chain
 *   • address
 *   • station match
 *   • confidenceScore
 */

/**
 * REGEL 4: MOCKDATA-REGLER
 * 
 * Mockdata og fixtures kan brukes for å validere:
 *   • parser
 *   • lagring
 *   • relasjoner
 *   • UI
 *   • pipeline
 * 
 * Men:
 *   • Mockdata skal alltid merkes
 *   • Mockdata skal ALDRI presenteres som ekte kildedata
 *   • Mockdata skal ALDRI blandes med produksjonsdata uten tydelig markering
 * 
 * Tillatte mockdata-typer:
 *   • fixture_test_data
 *   • ui_test_data
 *   • pipeline_test_data
 */

/**
 * REGEL 5: TOMTILSTAND ER BEDRE ENN MISVISENDE DATA
 * 
 * Hvis station_level-data mangler skal UI vise tydelig tomtilstand.
 * national_average skal ALDRI brukes som skjult erstatning for lokale stasjonspriser.
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEL 3: PERSONVERN OG IDENTITET
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * ALIAS OG DISPLAY NAME:
 *   • User.displayName lagres (hvis satt)
 *   • User.showContributionAlias toggle bestemmer om bidrag vises under alias
 *   • Alias vises IKKE offentlig i MVP — det er ren intern infrastruktur
 * 
 * USER_REPORTED SPORBARHET:
 *   • FuelPrice.reportedByUserId settes når pris rapporteres av innlogget bruker; ellers null
 *   • Feltet brukes ALDRI til offentlig visning i MVP
 *   • Det er grunnlag for fremtidig gamification (ikke implementert ennå)
 * 
 * DELING:
 *   • All offentlig deling av prisdata er anonym
 *   • Bruker-identitet eksponeres ALDRI i delte data
 *   • Kontroll: User.privacy_* toggle-felter
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEL 4: KILDEVALIDERING
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * ALLE DATAKILDER SKAL REGISTRERES I SOURCEREGI STRY
 * 
 * Gyldige integrationStatus-verdier:
 *   • planned
 *   • testing
 *   • parser_validated (parser er bekreftet, men kilde er IKKE live)
 *   • live (ekte ekstern henting bekreftet fra runtime-miljø)
 *   • blocked
 *   • deprecated
 * 
 * REGEL: Parser-validert ≠ Live
 * En kilde kan kun merkes **live** når ekte ekstern henting er bekreftet fra
 * runtime-miljøet. Hvis parser kun er validert mot fixture:
 *   integrationStatus = parser_validated
 */

/**
 * DATAGRANULARITET SKAL BEVISES
 * 
 * Gyldige dataGranularity-verdier:
 *   • national_average
 *   • regional_average
 *   • station_level
 *   • station (katalogkilder uten prisdata)
 *   • user_reported
 *   • unknown
 * 
 * Ingen kilde skal klassifiseres som station_level før dette er bekreftet fra:
 *   • Dokumentasjon, ELLER
 *   • Live respons
 */

/**
 * FEILLAG SKAL IDENTIFISERES FØR LØSNING FORESLÅS
 * 
 * Mulige feillag:
 *   • dns_error
 *   • network_error
 *   • auth_error
 *   • http_error
 *   • rendering_error
 *   • parsing_error
 *   • mapping_error
 *   • persistence_error
 *   • dashboard_error
 * 
 * Ingen ny teknisk løsning skal foreslås før feillaget er identifisert.
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEL 5: AI-AGENTRAMMER
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * REGEL 1: ÉN KRITISK ENDRING OM GANGEN
 * 
 * Ved migrering eller kildeintegrasjon skal arbeidet skje i denne rekkefølgen:
 *   1. Datamodell
 *   2. Kjent fungerende kilde
 *   3. Dashboard
 *   4. Ny kilde
 *   5. Automations
 *   6. Confidence-merging
 *   7. Crowdsourcing
 * 
 * Flere kritiske endringer skal IKKE implementeres parallelt uten eksplisitt begrunnelse.
 */

/**
 * REGEL 2: BE OM PREVIEW FØR APPLY
 * 
 * Når endringen påvirker mange records eller sentrale pipelines:
 *   • Be om preview/plan før apply
 *   • Vis eksempler på hva som vil endres
 *   • Få eksplisitt godkjenning før implementering
 * 
 * Dette gjelder særlig:
 *   • Bulk-klassifisering av stasjoner
 *   • Endringer på matching-logikk
 *   • Datamigrering
 *   • Parserkonfig-endringer
 */

/**
 * REGEL 3: RAPPORTERING ETTER HVERT STEG
 * 
 * Etter hver større endring skal det rapporteres:
 *   • Hva som fungerer
 *   • Hva som ikke fungerer
 *   • Hvilke felter som faktisk er bekreftet fra kilden
 *   • Hvilke kompromisser som er gjort
 *   • Hva som er neste anbefalte steg
 */

/**
 * REGEL 4: INGEN ANTAGELSER I DATAMODELL
 * 
 * Hvis et felt ikke kan hentes fra kilden:
 *   • Sett det til null
 *   • Dokumenter at det er null
 *   • IKKE fyll inn med "beste gjett"
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEL 6: STATIONREVIEW-GOVERNANCE (KRITISK)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * STATIONREVIEW BRUKES TIL:
 *   • Station-mastering (navneendringer, chain-klassifisering, duplikat-slåing)
 *   • Klassifiseringsavvik (innen eksisterende governance-typer)
 *   • Manuelle avklaringer (når regler ikke gir klart svar)
 * 
 * STATIONREVIEW BRUKES IKKE TIL:
 *   • Generelle oppgaver
 *   • Prisdata-problemer (bruk FetchLog for det)
 *   • Bruker-relaterte oppgaver (bruk annen kø for det)
 *   • Nye workflow-typer uten governance-oppdatering
 * 
 * KRITISK REGEL:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ NYE REVIEW-TYPER SKAL IKKE INNFØRES UTEN EKSPLISITT        │
 * │ OPPDATERING AV GOVERNANCE-DOKUMENTENE                       │
 * │                                                              │
 * │ Hvis en ny review_type skal legges til:                     │
 * │   1. Definer governance-regler for den
 * │   2. Oppdater dette dokumentet
 * │   3. Oppdater entity-schemat (FuelPrice.review_type enum)    │
 * │   4. Implementer logikk
 * │   5. Test med representativt datasett
 * │   6. Dokumenter resultat
 * └─────────────────────────────────────────────────────────────┘
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEL 7: FROSSEN FILES (IKKE RØR DISSE)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Følgende filer er låst fordi de implementerer kritisk governance-logikk.
 * Endringer på disse skal IKKE gjøres uten eksplisitt begrunnelse og gjennomgang.
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
 * Hvis du tror en av disse filene har en bug eller må endres:
 *   1. Dokumenter problemet
 *   2. Lag et test-case som viser problemet
 *   3. Spør Base44 AI-agent før endring
 *   4. Hvis endring godkjent: oppdater denne lista
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEL 8: TESTVALIDITET
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * REGEL 1: TESTRESULTATER FRA FIXTURES ≠ PRODUKSJON
 * 
 * Fixtures brukes for å validere:
 *   • Parser
 *   • Lagringspipeline
 *   • Relasjoner
 *   • Teknisk integrasjon
 * 
 * Men match-rate, coverage og datakvalitet må ALDRI evalueres basert på
 * begrensede fixtures. Hvis fixtures brukes i matchingtester skal dette
 * TYDELIG merkes i rapporten.
 */

/**
 * REGEL 2: TESTMILJØ OG PRODUKSJON SKAL SKILLES TYDELIG
 * 
 * Ved testing skal systemet eksplisitt rapportere om data kommer fra:
 *   • Live kilder
 *   • Fixtures
 *   • Mockdata
 * 
 * Match-rate eller dekningstall fra blandede datakilder skal ALDRI
 * presenteres som reell systemytelse.
 */

/**
 * REGEL 3: FØR MATCHING-LOGIKK JUSTERES SKAL FØLGENDE BEKREFTES
 * 
 *   • OSM-stasjonskatalogen er representativ for området som testes
 *   • Eksterne pris-kilder er hentet live
 *   • Testområdet inneholder realistisk variasjon i kjeder og stasjoner
 * 
 * Hvis ikke skal resultatet klassifiseres som: test_environment_limited
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEL 9: PLAUSIBILITY OG DATAKVALITET
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * ALLE PRISKILDER SKAL PASSERE PLAUSIBILITY CHECK
 * 
 * Hvis pris faller utenfor realistisk intervall for norsk drivstoff:
 *   • Klassifiser som suspect
 *   • Behandl IKKE som normal gyldig pris uten eksplisitt begrunnelse
 *   • Dokumenter why-så hvis den godtas likevel
 * 
 * Realistisk intervall for Norge (2026):
 *   • Bensin 95: 16 — 25 NOK/L
 *   • Diesel: 15 — 24 NOK/L
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSJONHISTORIE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * v1.0 (2026-03-09)
 *   • Initiell versjon
 *   • Fire mini-patches implementert per feedback:
 *     - Nye review-typer krever eksplisitt governance-oppdatering
 *     - StationReview er for station-mastering/klassifiseringsavvik innen eksisterende typer
 *     - reportedByUserId settes når pris rapporteres av innlogget bruker; ellers null
 *     - AI skal be om preview/plan før apply når endringer påvirker mange records
 *   • Konsistente filreferanser (.js)
 *   • Alle seksjonstitler presisert og låst
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SLUTT PÅ DOKUMENT
 * ═══════════════════════════════════════════════════════════════════════════════
 */