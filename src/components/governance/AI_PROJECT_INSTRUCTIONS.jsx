# AI PROJECT INSTRUCTIONS — TANKRADAR
v1.4 (Chunked Governance + Repository Verification + Safety Guards + Base44 Integration)

Datert: 2026-03-10  
Status: Production Governance Document

Dette dokumentet formaliserer systemstruktur, datagovernance, AI-agentrammer og utviklerprotokoll for TankRadar.

Endringer i dette dokumentet krever eksplisitt versjonsoppdatering.

---

## 0. Repository Access

AI-agenter har eksplisitt tilgang til:

```
https://raw.githubusercontent.com/Luckywolf82/tankradar
```

Repository:

```
https://github.com/Luckywolf82/tankradar
```

AI må alltid verifisere repository-tilstand før forslag til nye endringer.

---

## 1. Execution Log (Canonical Governance Record)

TankRadar bruker et chunked execution log system.

Canonical entry point:

```
src/components/governance/Phase25ExecutionLogIndex.jsx
```

Dette dokumentet definerer:

* hvilke chunk-filer som finnes
* hvilke entries som ligger i hver chunk
* hvilken chunk som er aktiv append-target

### Execution Log Structure:

```
src/components/governance/

Phase25ExecutionLogIndex.jsx
Phase25ExecutionLog_001.jsx
Phase25ExecutionLog_002.jsx
Phase25ExecutionLog_003.jsx
Phase25ExecutionLog_004.jsx
Phase25ExecutionLog_005.jsx ← ACTIVE
Phase25ExecutionLog.jsx ← deprecated stub
```

### Append Rule:

Nye entries skal aldri skrives til stub-filen.

AI må:

1. lese Phase25ExecutionLogIndex.jsx
2. identifisere aktiv chunk
3. append ny entry til aktiv chunk

---

## 2. Forbidden Log Patterns

Følgende filtyper er permanent forbudt:

```
Phase25ExecutionLog_EntryXX.jsx
Phase25ExecutionLog_Summary.jsx
Phase25ExecutionLog_Incident.jsx
```

Execution log skal kun bestå av:

* Index
* Chunk files
* Stub file

---

## 3. Systemstruktur

Sentral modell:

```
Station
FuelPrice
StationCandidate
StationReview
SourceRegistry
```

### Prinsipp:

Different source adapters → Shared mastering core

Adapters håndterer kun ingest.

Matching, station identity og review governance skjer i felles kjerne.

---

## 4. Dataintegritet

### Regler:

* ikke bland datatyper
* ingen stille fallback
* ingen antakelser som fakta
* mockdata må merkes
* tomtilstand er bedre enn feil data

### Matching outcomes er pipeline-states:

```
matched_station_id
review_needed_station_match
no_safe_station_match
```

---

## 5. Personvern

* alias vises ikke offentlig
* reportedByUserId brukes kun internt
* prisdata anonymiseres i MVP

---

## 6. Kildevalidering

SourceRegistry er sannhetskilde for:

* integrationStatus
* dataGranularity
* updateFrequency
* failureReason

parser_validated betyr ikke live.

---

## 7. AI Agent Rules

AI må følge disse prinsippene:

* én kritisk endring om gangen
* preview før apply
* rapportering etter hvert steg
* ingen antagelser i datamodell
* foreslå nøyaktig ett trygt neste steg

---

## 8. StationReview Governance

StationReview brukes kun til:

* station mastering
* klassifiseringsavvik
* manuelle avklaringer

Nye review_types krever governance-oppdatering.

---

## 9. Frozen Files

Følgende filer er låst:

```
functions/classifyStationsRuleEngine.*
functions/classifyGooglePlacesConfidence.*
functions/classifyPricePlausibility.*
functions/deleteAllGooglePlacesPrices.*
functions/deleteGooglePlacesPricesForReclassification.*
functions/verifyGooglePlacesPriceNormalization.*
functions/matchStationForUserReportedPrice.*
functions/auditPhase2DominanceGap.*
functions/getNearbyStationCandidates.*
functions/validateDistanceBands.*
```

Endringer krever:

1. rapport
2. diff-analyse
3. governance-vurdering
4. eksplisitt godkjenning

---

## 10. Locked Phase-2 Matching Engine

Kritiske komponenter:

```
functions/matchStationForUserReportedPrice.*
functions/stationMatchingEngine*
functions/stationDistanceScoring*
functions/reviewRouting*
```

### Hardlåste regler:

```
SCORE_MATCHED = 65
SCORE_REVIEW_THRESHOLD = 35
DOMINANCE_GAP_MIN = 10
```

Hvis endring oppdages:

1. rapporter
2. analyser diff
3. stopp implementering

---

## 11. Repository Verification Protocol

GitHub er eneste sannhetskilde.

Base44 runtime er ikke tilstrekkelig.

AI må verifisere:

1. commit history
2. diff
3. faktisk filinnhold
4. governance-filer

Hvis repo-kode og governance-logger er uenige:

**repository-kode vinner.**

---

## 12. Execution Log Entry Requirements

Hver entry må inneholde:

* Task requested
* Files created
* Files modified
* Diff summary
* Commit hash (eller "unavailable in current Base44 context")
* Locked file verification
* GitHub visibility confirmation

GitHub visibility må være enten:

```
Confirmed visible in GitHub after publish
```

eller

```
Not yet visible in GitHub after publish
```

---

## 13. Repository Completion Rule

En oppgave er kun ferdig når:

1. Endringen finnes i repository
2. Endringen er logget i execution log
3. Locked files er bekreftet urørt

Hvis endringen ikke er synlig i GitHub:

**oppgaven er ikke ferdig.**

---

## 14. Development Loop

Standard loop:

```
verify → propose → implement → publish → verify
```

AI må alltid:

1. verifisere repository
2. lese execution log index
3. identifisere siste entry
4. foreslå ett trygt neste steg

---

## 15. "Fortsett" Command

Når brukeren skriver fortsett, skal AI:

1. verifisere repository
2. lese execution log index
3. identifisere aktiv chunk
4. lese siste entry
5. sjekke locked filer
6. identifisere neste minimale steg
7. generere én Base44-prompt

---

## 16. Repository State Guard

Før AI foreslår nye endringer må følgende verifiseres:

1. Phase25ExecutionLogIndex.jsx må kunne leses fra GitHub.
2. Aktiv chunk må identifiseres.
3. Siste entry i aktiv chunk må identifiseres.
4. AI må eksplisitt referere siste entry før nytt forslag.

Hvis siste execution entry ikke kan verifiseres i repository:

AI må stoppe og rapportere:

```
Repository state cannot be verified.
```

Ingen nye endringer skal foreslås før repository state er bekreftet.

---

## 17. Critical Surface Guard

Følgende systemflater anses som kritiske:

1. Station identity / station mastering
2. Station matching pipeline
3. FuelPrice → Station linkage
4. Duplicate remediation logic
5. Alert triggering logic
6. Notification generation pipeline

AI-agenter har ikke lov til å:

* introdusere alternative pipelines
* introdusere parallelle matching engines
* lage nye entities som dupliserer eksisterende systemlogikk
* omgå eksisterende governance-flows

Hvis en oppgave krever ny logikk innenfor en kritisk systemflate:

AI må stoppe og foreslå en design-endring først.

Ingen implementering skal skje før eksplisitt godkjenning.

---

## 18. Change Scope Limit

AI-agenter må begrense endringer per implementeringssteg.

### Standardgrenser:

* Maks 3 filer endret per steg
* Maks 1 ny entity per steg
* Maks 1 ny backend function per steg
* Maks 1 UI-komponent per steg

Hvis en oppgave krever større endring:

AI må først foreslå en plan som deler arbeidet i flere steg.

Ingen implementering før stegene er eksplisitt godkjent.

Execution log entries må reflektere ett klart, isolert steg.

---

## 19. Base44 Platform Integration

### Base44 Editor State Protocol

* Base44 editor state = aktuell utvikling
* GitHub repository = kanonisk offentlig tilstand
* Diskrepanser løses ved: **GitHub vinner**

### When Changes Sync to GitHub:

* Base44 publishes changes through its version control integration
* Developer or AI can request force sync if configured
* Verification requires checking actual GitHub repository, not Base44 state alone

### Entry Visibility Status:

When appending execution log entries, always specify:

```
GitHub visibility status: [Confirmed visible | Not yet visible | Awaiting sync]
```

---

## 20. Versjonshistorie

* v1.0 – initial governance
* v1.1 – repo verification + locked matching rules
* v1.2 – GitHub visibility protocol
* v1.3 – chunked execution log + governance safety guards
* v1.4 – Base44 integration + repo-sync clarity + frozen file updates