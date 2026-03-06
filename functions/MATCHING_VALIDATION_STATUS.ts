MATCHING VALIDATION STATUS
==========================

OVERSIKT
--------
Matching-logikken mellom GooglePlaces og OpenStreetMap er per nå parser-validert mot kombinert fixture-data.
Ingen del av matching er ennå bevist mot live kilder.

DEL 1: HVA ER FAKTISK VALIDERT?
==============================

✅ PARSER-VALIDERT (Fixture-basert)
- Haversine-distanse (meter)
- Chain-normalisering
- Name-inference fra Google
- Matching-sortering
- ConfidenceScore-tildeling
- FuelPrice-opprettelse
- Unmatched-logg

❌ IKKE VALIDERT (Krever live kilder)
- Live GooglePlaces API respons
- Live OSM respons
- Real-world matching rate
- Coverage per region
- Fuel types observert i virkelige data

DEL 2: TESTGRUNNLAG – HVA ER FRA HVOR?
====================================

OpenStreetMap data:
  Status: fixture
  Kilder: 15 håndpikket station-records i fetchOpenStreetMapStations.js
  Kjeder: Circle K, Uno-X, Esso, Shell
  Manglende kjeder: St1, Statoil, Tanken, YX
  Live Overpass API: 504 Service Unavailable → fallback til fixture

GooglePlaces data:
  Status: test API
  Antall: ~75 stasjoner returnert
  Begrenset dekning: 30 uten prisdata, flere fra ukjente kjeder

KRITISK PUNKT:
GooglePlaces og OSM bruker IKKE samme underliggende stasjonsgrunnlag:
- OSM-fixture: 15 handpikket stasjoner
- GooglePlaces: 75 stasjoner fra egne data
- Estimert overlap: < 30%

DEL 3: MATCH-RATE TOLKING
=========================

Nåværende resultat:
- Match-rate: 4.0% (3 av 75)
- Gjennomsnittlig matchDistanceMeters: 86m
- FuelPrice opprettet: 5

HVORFOR DISSE TALLENE IKKE ER REPRESENTATIVE:

1. GooglePlaces dekkingsgrunnlag
   - TestAPI returnerer fra begrenset område
   - Mange stasjoner er restauranter/barer med "fuel" merket
   - Ikke representative for ekte nasjonalt dekkingsbilde

2. OSM-fixture er håndpikket
   - Bare 15 stasjoner
   - Mangler kjeder som GooglePlaces returnerer (St1, Statoil, Tanken)
   - Ikke skaljerbar testing

3. Overlapp er utilsiktet
   - 3 av 15 OSM-stasjoner matches med GooglePlaces
   - Skyldes geografisk nærhet, ikke garantert matching i full dataset

4. KONSEKVENS
   - 4% match-rate er IKKE bevis på dårlig matching-logikk
   - Testen viser at matching-logikk fungerer korrekt på fixture
   - Testen viser IKKE reell dekkingspotensial med live data

DEL 4: 7 MATCHING-SCENARIER
===========================

Scenario 1: Perfekt match (chain + navn + kort avstand)
  Eksempel: "Circle K Tunga" → "Circle K Tunga" @ 5m
  Status: ✅ BEVIST (fixture)
  Forekomster: 1 av 75

Scenario 2: God match (chain + adresse + kort avstand)
  Eksempel: "Esso" → "Esso Enebakkveien" @ 34m
  Status: ✅ BEVIST (fixture)
  Forekomster: 1 av 75

Scenario 3: Svak match (chain + moderat avstand)
  Eksempel: "Uno-X 7-Eleven Blåsenborg" → "Uno-X Stavanger" @ 218m
  Status: ✅ BEVIST (fixture)
  Forekomster: 1 av 75
  ⚠️ CAVEAT: Testmatrisestørrelse vanskeliggjør tolking av denne kvaliteten irl

Scenario 4: Feil match (samme chain, feil stasjon)
  Eksempel: "Circle K A" vs "Circle K B" vs "Circle K C" på samme sted
  Status: ❌ IKKE TESTET I FIXTURE
  Risk: Høy – kunne matche feil stasjon hvis avstander er like

Scenario 5: Unmatched – kjede finnes ikke i OSM
  Eksempel: "YX 7-Eleven", "Tanken"
  Status: ✅ BEVIST (fixture)
  Forekomster: 3 av 75

Scenario 6: Unmatched – distance_too_large
  Eksempel: Stasjoner > 500m unna
  Status: ✅ BEVIST (fixture)
  Forekomster: 39 av 75
  ⚠️ NOTE: Høyt antall skyldes at GooglePlaces og OSM-fixture ikke er synkronisert

Scenario 7: Unmatched – no_price_data
  Eksempel: "Kongen Marina Beach Club Bar & Restaurant" uten fuelOptions
  Status: ✅ BEVIST (fixture)
  Forekomster: 30 av 75

DEL 5: MATCHING-LOGIKK EVALUERING
=================================

Hva matching-koden faktisk gjør:
  Steg 1: Motta GooglePlaces respons
  Steg 2: For hver stasjon, identifiser chain fra displayName
  Steg 3: Normaliser chain
  Steg 4: Sjekk alle OSM-stasjoner med samme chain
  Steg 5: Beregn Haversine-distanse
  Steg 6: Velg best match hvis distanse < 500m
  Steg 7: Tildel confidenceScore basert på distanse
  Steg 8: Opprett FuelPrice eller logg unmatched

Hva som er bevist:
  ✅ Parser-logikk: Koden gjør akkurat som designet
  ✅ Matematikk: Haversine-beregning er korrekt
  ✅ Normalisering: Chain-matching fungerer konservativt
  ✅ Klassifisering: Unmatched-årsaker er semantisk tydelig

Hva som IKKE kan evalueres fra testen:
  ❌ Real-world overlap: Hvordan live GooglePlaces matcher live OSM
  ❌ Coverage-rate: Reell prosent av alle norske stasjoner som kan matches
  ❌ Stability over tid: Hvordan matching presterer ved oppdateringer
  ❌ False positives: Risiko for feil matching med virkelige data

DEL 6: KONKLUSJON
================

Matching-logikken er parser-validert, men dekkingen kan ikke evalueres rettferdig før:

1. Live OSM-data hentes fra Overpass API (uten 504 error)
2. Live GooglePlaces-data samles fra representative områder
3. Match-rate beregnes på minst 100 stasjoner per by
4. Unmatched-årsaker klassifiseres statistisk
5. False positives identifiseres manuelt

IKKE før disse stegene skal matching-threshold justeres.

Matching-logikk-versjon: FRYST v1
Ingen ytterligere optimiseringer inntil data er validert.

Rapport: 2026-03-06