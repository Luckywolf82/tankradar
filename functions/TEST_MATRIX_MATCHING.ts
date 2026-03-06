MATCHING TEST MATRIX
====================

FORMÅL
------
Dokumenter hvilke matching-scenarier som er testet, hvilke kilder som ble brukt, og hva resultatene betyr.

TEST SETUP
----------

Data kilder:
  OpenStreetMap | fixture | 15 stasjoner | 4 kjeder
  GooglePlaces  | test API | 75 stasjoner | mange kjeder
  Test-koordinater | fixture | 4 by-sentraler | Oslo, Trondheim, Bergen, Stavanger

SCENARIO-RESULTATER
===================

Scenario 1: ✅ PERFEKT MATCH
  Betingelser:
    - Chain match: JA
    - Navn-overlapp: JA (identisk eller veldig lik)
    - Distanse: < 50m
    - Pris-data: JA
  
  Test-eksempel:
    Google:      "Circle K Tunga"
    OSM:         "Circle K Tunga"
    Distanse:    5m
    Resultat:    MATCHED
    Confidence:  0.90
    Status:      ✅ BEVIST (fixture)
  
  Forekomster: 1 av 75
  Implikasjon: Matching fungerer når dataene er nesten identiske

Scenario 2: ✅ GOD MATCH
  Betingelser:
    - Chain match: JA
    - Navn-overlapp: Delvis
    - Distanse: 50-150m
    - Pris-data: JA
  
  Test-eksempel:
    Google:      "Esso"
    OSM:         "Esso Enebakkveien"
    Distanse:    34m
    Resultat:    MATCHED
    Confidence:  0.85
    Status:      ✅ BEVIST (fixture)
  
  Forekomster: 1 av 75
  Implikasjon: Matching tolererer navn-variasjon over korte avstander

Scenario 3: ⚠️ SVAK MATCH
  Betingelser:
    - Chain match: JA
    - Navn-overlapp: Lav eller nei
    - Distanse: 150-300m
    - Pris-data: JA
  
  Test-eksempel:
    Google:      "Uno-X 7-Eleven Blåsenborg"
    OSM:         "Uno-X Stavanger"
    Distanse:    218m
    Resultat:    MATCHED
    Confidence:  0.65
    Status:      ✅ BEVIST (fixture)
  
  Forekomster: 1 av 75
  Implikasjon: Matching aksepterer større avvik ved god chain-match
  ⚠️ CAVEAT: Svak match er akseptabel i testoppsett, men kan få feil stasjon med flere kandidater

Scenario 4: ❌ FEIL MATCH (Overlappende kandidater)
  Betingelser:
    - Chain match: JA, men flere stasjoner
    - Distanse: Flere kandidater < 300m
    - Risk: Matcher "første beste" istedenfor "beste beste"
    - Pris-data: JA
  
  Test-eksempel som MANGLER i test:
    Google:      "Circle K" (mange mulige)
    OSM:         "Circle K A" @ 59.9000, 10.7500
                 "Circle K B" @ 59.8900, 10.7400 (150m fra A)
                 "Circle K C" @ 59.9100, 10.7600 (150m fra A)
    Distanse:    Lik for B og C
    Resultat:    ??? Velger A eller B eller C?
    Confidence:  0.80 (samme for alle)
    Status:      ❌ IKKE TESTET
  
  Forekomster: 0 (ikke testet)
  Implikasjon: Test-dataene har ikke flere kandidater i samme kjede – kan skjule feil-matching

Scenario 5: ✅ UNMATCHED – Kjede mangler i OSM
  Betingelser:
    - Chain: Ikke gjenkjent i fixture
    - OSM: Ingen stasjoner for denne kjeden
    - Resultat: Unmatched
  
  Test-eksempel:
    Google:      "YX 7-Eleven"
    Chain inferred: "YX"
    OSM:         Ingen YX-stasjoner
    Resultat:    UNMATCHED
    Reason:      chain_not_in_osm
    Status:      ✅ BEVIST (fixture)
  
  Forekomster: 3 av 75
  Implikasjon: Matching blokkeres riktig når kjede mangler
  ⚠️ CAVEAT: OSM-fixture er ikke komplett – antall virkelige manglende kjeder er ukjent

Scenario 6: ✅ UNMATCHED – Distanse for stor
  Betingelser:
    - Chain match: JA
    - Distanse: > 300-500m
    - Resultat: Unmatched
  
  Test-eksempel:
    Google:      "Circle K Uelands gate"
    OSM:         Ikke i fixture
    Distanse:    > 300m eller ikke matchet
    Resultat:    UNMATCHED
    Reason:      distance_too_large
    Status:      ⚠️ TESTOPPSETT-AVHENGIG
  
  Forekomster: 39 av 75
  Implikasjon: Høy andel skyldes at GooglePlaces og OSM-fixture ikke er synkronisert

Scenario 7: ✅ UNMATCHED – Ingen pris-data
  Betingelser:
    - GooglePlaces returnerer stasjon, men uten fuelOptions
    - Resultat: Unmatched
  
  Test-eksempel:
    Google:      "Kongen Marina Beach Club Bar & Restaurant"
    fuelOptions: {} (tom)
    Resultat:    UNMATCHED
    Reason:      no_price_data
    Status:      ✅ BEVIST (fixture)
  
  Forekomster: 30 av 75
  Implikasjon: GooglePlaces returnerer mange ikke-prisrelevante steder – korrekt filtrert ut

SAMLET ANALYSE
==============

Hva testen VISER:
  ✅ Parser-logikk fungerer som designet
  ✅ Chain-normalisering fungerer
  ✅ Distance-beregning er korrekt
  ✅ Confidence-scoring er konsistent
  ✅ Unmatched-årsaker klassifiseres riktig

Hva testen IKKE kan vise:
  ❌ Real-world match-rate (4% er ikke representative)
  ❌ Risk for feil-matching med overlappende kandidater (ikke testet)
  ❌ Live API-stabilitet (test-API, ikke produksjon)
  ❌ Coverage over hele Norge (kun 4 testby)
  ❌ Sesongende eller tidsvariable data (one-time snapshot)

Hva som mangler fra test-matrise:
  Scenario 4 (feil match) | OSM-fixture har ingen overlappende kandidater | Legg til flere Circle K/Esso/Shell i samme område
  Scenario 6 (distance) | GooglePlaces og OSM index er ikke synkronisert | Bruk live OSM API isteden for fixture
  Coverage-test | Kun 4 steder testet | Test minst 10 fylker eller hele byer
  Temporal-test | Kun snapshot, ingen tidsendringer | Kjør matching på samme data over flere dager

KONKLUSJON
==========

Matching-logikken er parser-validert, men dekkingen kan ikke evalueres rettferdig før:

1. Live OSM data (hele Norge, ikke fixture)
2. Live GooglePlaces data (hele Norge, ikke 4 testby-koordinater)
3. Overlap-test (flere kandidater i samme kjede)
4. Regional coverage-analyse

Før da: Behandle 4% som "systemet fungerer på fixture-data", IKKE som "GooglePlaces dekning er 4%".

Matrix versjon: 1.0
Sist oppdatert: 2026-03-06