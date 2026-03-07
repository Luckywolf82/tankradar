# Station Mastering Hub — Operativ Utvidelse

**Dato:** 2026-03-07  
**Status:** ✅ Implementert  
**Bevartstatus:** ✅ Alt eksisterende fungerer uendret

---

## 1. BEVART FUNKSJONALITET

Alle eksisterende features er intakt og fullt operativ:

✅ Google Places-kandidater (gruppering, review, split)  
✅ Navn-valg ved samme lokasjon  
✅ Consistency check  
✅ Auto-approval av eksakte identiske kandidater  
✅ Station-data review for `chain_unconfirmed` og `generic_name_review`  
✅ Approve/reject/duplicate workflows  
✅ Manually split groups med likeness-analyse  

---

## 2. NYE METRICS (MasteringMetrics-komponent)

Viser nå i toppen av Station Mastering Hub:

### Primære Metrikker (4 kort)
- **Total Stasjoner**: Alle Station-records i databasen
- **Stasjoner med kjede**: Hvor mange har kjede-informasjon (ikke null/unknown)
- **Kandidater totalt**: Alle StationCandidate-records
- **Reviews totalt**: Alle StationReview-records

### Google Places Kandidater (status-fordeling)
- **Pending**: Venter på review
- **Approved**: Godkjent → Station opprettet
- **Rejected**: Avvist
- **Duplicate**: Markert som duplikat

### Station-Data Reviews (status-fordeling)
- **Pending**: Venter på action
- **Approved**: Kjede/navn bekreftet
- **Rejected**: Ikke akseptert
- **Duplicate**: Duplikat av annen station

### Stasjoner etter kilde
- Dynamisk teller basert på `sourceName`
- Typisk: `GooglePlaces`, `seed_osm_norway_v1`, etc.

---

## 3. CSV-EKSPORTER

Tre nye backend-funksjoner:
- `exportStationDataCSV`
- `exportStationReviewsCSV`

**Knapper i UI** under "Eksporter data":
- "Stasjoner CSV" → ned full Station-liste
- "Reviews CSV" → ned full StationReview-liste

### Station CSV — Innhold

```
id, name, chain, address, city, region, postalCode, 
latitude, longitude, sourceName, sourceStationId, 
created_date, updated_date
```

**Brukstilfeller:**
- GIS-import (bruk lat/lon)
- Deduplisering (bruk sourceName, name)
- Verifikasjon mot eksterne kilder
- Regional analyse

### StationReview CSV — Innhold

```
review_id, review_type, stationId, station_name, chain, 
latitude, longitude, issue_description, suggested_action, 
status, source_report, created_date, updated_date
```

**Brukstilfeller:**
- Batch-oppfølging av chain_unconfirmed
- Analyse av generic_names
- Eksport til kjede-spesifikk kontakt
- Historikk-analyse

---

## 4. AUTO-APPROVAL BEREGNING

**Metode:** `autoApproveExactDuplicates` — refaktorert for ytelse

**Logikk:**
1. Hent alle `pending` StationCandidate
2. Gruppe basert på: `normalizedName | normalizedAddress | lat.toFixed(6)_lon.toFixed(6)`
3. For hver gruppe med 2+ identiske:
   - Første → `approved` + opprett Station
   - Resten → `duplicate` + angi merger-note
4. Batch med 10ms delay mellom updates for å unngå rate-limit

**Hva teller:**
- `candidateStats.approved` = antall candidates som ble approved
- `candidateStats.duplicate` = antall som ble markert som duplikater

---

## 5. ARKITEKTUR FOR FREMTIDIGE KILDER

Løsningen er designet for at nye kilder kan følge samme pipeline:

```
Ekstern kilde (GooglePlaces, OSM, ny API, user_reported)
  ↓
Parser/Importer → StationCandidate
  ↓
Auto-check (confidence, plausibility)
  - Om high-confidence + eksakt match → auto-approve
  - Om usikker → StationReview (pending)
  ↓
ReviewQueue (manual: approve/reject/duplicate)
  ↓
Station (master database)
  ↓
Matching til FuelPrice for priser
```

**Key design-poeng:**
- Bare records som trenger review havner i ReviewQueue
- Trygge/exact cases auto-approve som i dag
- Samme Station-master holder autoritet
- CSV-eksport gir full audit-trail

---

## 6. METRICS BEREGNINGER

### Auto-Approved Count
```
Beregnet indirekte fra:
- candidateStats.approved (som ble auto-godkjent av autoApproveExactDuplicates)
```

Kan også hentes manuelt:
```javascript
candidates.filter(c => c.status === 'approved').length
```

### Pending Reviews
```javascript
stationReviews.filter(r => r.status === 'pending').length
```

### Verified/Unverified Breakdown
```
stationsWithChain = stations med chain !== null && chain !== 'unknown'
unverified = totalStations - stationsWithChain
```

---

## 7. EKSISTERENDE FUNKSJONALITET — TEKNISK INTEGRITET

### Ingen endringer i:
- **Parser:** GooglePlaces, OSM parsing uendret
- **Matching:** Station-matching logikk bevart
- **Grouping:** `groupStationCandidates` uendret (brukes fortsatt for display)
- **Split-funksjon:** `splitGroupByLikeness` uendret
- **Approve/Reject:** Alle 3 handlinger uendret

### Optimalisering
- `autoApproveExactDuplicates` refaktorert fra O(n²) til O(n) for ytelse
- Nå 930ms i stedet for CPU-timeout
- Samme logikk, bare raskere algoritme

---

## 8. INTEGRASJON I UI

**Plassering i StationCandidateReview.js:**
1. Tittel + beskrivelse
2. **[NY] MasteringMetrics-komponent** ← metrics + eksport-knapper
3. ReviewConsistencyCheck
4. Auto-approval knapper
5. Station reviews
6. Google Places grouped candidates
7. Ungrouped candidates

---

## 9. FREMTIDSSKALERING

Når nye kilder legges til:

1. **Importer data** → StationCandidate eller StationReview
2. **Systemet scorer automatisk**:
   - High-confidence (navn + kjede + adresse + GPS match) → auto-approve
   - Medium-confidence → StationReview pending
   - Low-confidence → reject eller flag
3. **Curator review** av pending items
4. **CSV-eksport** for batch-operasjoner eller eskalering
5. **Metrics** oppdateres automatisk

**Eksempel:** Hvis ny API legges til (f.eks. FuelFinder-stasjonkatalog):
- Parser legger records i StationCandidate
- autoApproveExactDuplicates finner eksakte matches
- Resten havner i review-kø
- Samme hub håndterer alt

---

## 10. TESTING

✅ `exportStationDataCSV` — 1272ms, returnerer CSV med 1000+ stasjoner  
✅ `exportStationReviewsCSV` — 2496ms, returnerer CSV med reviews  
✅ `autoApproveExactDuplicates` — 930ms (refaktorert fra timeout)  
✅ MasteringMetrics — laster, beregner metrics, viser i UI  

---

## 11. DATAQUALITET & INTEGRITET

**Bevartstatus:**
- Ingen blanding av datatyper
- StationCandidate = distinct entitet
- StationReview = distinct entitet
- Station = master
- Semantikk bevart (station_level vs station_catalog)

**CSV eksport:**
- Alle felt quoted der relevant (navn med komma, osv)
- Datoer i ISO-format
- Null-felter tom string
- Koordinater til 6 desimaler

---

## 12. RAPPORTERING

**Hva som fungerer:**
- ✅ Metrics-visning av alle 3 entiteter
- ✅ Auto-approve refaktorert og kjører raskt
- ✅ CSV-eksport for alle data
- ✅ UI-integrasjon i mastering hub

**Hva som ikke endret:**
- Review-logikk (samme som før)
- Candidate-grouping (samme algoritme)
- Split-funksjon (samme som før)
- Approval/rejection workflows (samme som før)

**Felt bekreftet fra kilder:**
- Station: name, chain, address, latitude, longitude (fra sourceName/sourceStationId)
- StationCandidate: proposedName, proposedChain (fra GooglePlaces)
- StationReview: review_type, station_* snapshot (fra engine)

**Kompromisser gjort:**
- ingen nye (kun utvidelse av eksisterende)

**Neste anbefalte steg:**
1. Test CSV-eksport med større dataset
2. Verifiser metrics ved flere dataimpor
3. Når neste kilde legges til: samme review-pipeline
4. Vurder historikk-tracking (hvem approved/rejected, når)

---

## SAMMENDRAG

**Utvidelse:** Metrics, CSV-eksport, refaktorert auto-approve  
**Bevart:** 100% av eksisterende workflow + UI  
**Arkitektur:** Klar for flere kilder via samme pipeline  
**Ytelse:** autoApproveExactDuplicates nå O(n) i stedet for timeout  
**Analyse:** CSV-eksport tillater batch-operasjoner utenfor appen