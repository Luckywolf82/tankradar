# Canonical Station-Price Read Contract

**Merk:** *Dette er IKKE en funksjonsoppgave eller bred rydde-opp.* Gjeldende kodebase er stabil; vi skal **kun** konsolidere leselogikken for stasjonspriser slik at alt bruker samme felles datakontrakt.

## Eksisterende og manglende moduler
- `src/utils/fuelPriceEligibility.js` – ferdig, **kanonisk**【59†L489-L497】. Inneholder `isStationPriceDisplayEligible(p, opts)`. 
- `src/utils/currentPriceResolver.js` – ferdig, **kanonisk**【63†L47-L55】. Inneholder `resolveLatestPerStation`, `resolveLatestPerFuelType`, osv.
- **Mangler:** `src/utils/fuelTypeUtils.js` – ny modul for `normalizeFuelType`.
- **Mangler:** `src/utils/fuelPriceQueries.js` – ny modul for felles `FuelPrice`-spørringer.

## Regelverk for koden *fremover*
1. **Audit før endring:** Les alltid de faktiske filene listet under. Ikke stoler på hukommelse. Finn eventuelle duplikater første.
2. **Kanoniske verktøy:** All stasjonspris-lese-logikk skal gå gjennom:
3. **Forbudt mønster:** Ingen nye inline-funksjoner som:
- `normalizeFuel` eller egen fuelType-mapping (bruk `normalizeFuelType`).
- Egne `base44.entities.FuelPrice.filter`-kall spredt i komponenter (bruk `fetchFuelPricesBy...`).
- Egen `isStationPriceDisplayEligible`-logikk (bruk `fuelPriceEligibility`).
- Egen “resolve latest”-logikk (bruk `currentPriceResolver`).
4. **Mål:** Alle nye endringer *skal importere* de kanoniske funksjonene. Hvis noe mangler i de delte modulene, legg til der – ikke lag ny duplikat. 
5. **Rapportering:** Et PR må inkludere:
- Liste over filer inspisert.
- Duplikater funnet (linjer/kode).
- Avgjørelse: Hvilke filer ble kanoniske for hvilke funksjoner.
- Hvilke filer som er endret, med én-linjers formål.
- Bekreft at oppførsel er uendret (ingen nye regler).
6. **Eksempel på bruk:** 
```js
import { normalizeFuelType } from "@/utils/fuelTypeUtils";
import { fetchFuelPricesByStationsAndFuel } from "@/utils/fuelPriceQueries";
import { isStationPriceDisplayEligible } from "@/utils/fuelPriceEligibility";
import { resolveLatestPerStation } from "@/utils/currentPriceResolver";

const fuel = normalizeFuelType(selectedFuel);
const rawPrices = await fetchFuelPricesByStationsAndFuel({ stationIds, fuelType: fuel });
const eligible = rawPrices.filter(p => isStationPriceDisplayEligible(p, { requireMatchedStationId: true }));
const latestByStation = resolveLatestPerStation(eligible);

> *Agresivt prompt-eksempel:*  
> `*Audit everything first!* For hvert sted hvor dere må lese FuelPrice, bruk `normalizeFuelType` og `fuelPriceQueries` fra `@/utils`. Ikke skriv egen “normalizeFuel” eller løpende `.filter` i komponentene! All ekstern feilmargin skal håndteres av `fuelPriceEligibility` og `currentPriceResolver`.`  

Kort oppsummert: **Alle** endringer som leser stasjonspriser skal sende data gjennom samme verktøykjede. 

# D. Sammenfatning av call sites

| Fil (repo-relative)                         | Linjer (eksempel)           | Inlined logikk                                                             |
|--------------------------------------------|-----------------------------|----------------------------------------------------------------------------|
| **NearbyPrices.jsx**【32】                  | 12–19                       | `const normalizeFuel = …` (egendefinert normalisering)                      |
| (dashboard/NearbyPrices.jsx)                | 64–71                       | `fuelTypeLabel`-kart (UI-labels for drivstoff)                              |
|                                            | 132–139                     | `FuelPrice.filter({stationId, fuelType})` i løkke (inline spørring)         |
|                                            | 157–162                     | Filtrerer med `isStationPriceDisplayEligible(p, { requireMatchedStationId: true })` (shared) |
|                                            | 177–180                     | `resolveLatestPerStation(...)` (delt) og `isFreshEnoughForNearbyRanking`     |
| **StationDetails.jsx**【56】                | 12–19                       | `fuelTypeLabel`-kart (UI)                                                   |
| (pages/StationDetails.jsx)                  | 38–42                       | `priceTypeLabel`-kart (UI)                                                  |
|                                            | 64–72                       | `FuelPrice.filter({stationId}, "-fetchedAt", 200)` (inline spørring)         |
|                                            | 71–74                       | Filtrerer med `isStationPriceDisplayEligible` (shared)                      |
|                                            | 133–139                     | `resolveLatestPerFuelType(displayPrices)` (delt)                            |
| **RecentPricesFeed.jsx**【57】             | 9–17                        | `fuelTypeLabel`-kart (UI)                                                   |
| (dashboard/RecentPricesFeed.jsx)           | 19–23                       | `sourceLabel` (UI)                                                          |
|                                            | 55–58                       | `FuelPrice.filter({plausibilityStatus:"realistic_price"},...)` (inline spørring) |
|                                            | 80–88                       | Egne filter på plausibility og station_match_status (burde bruke eligibility) |

Hver av disse radene representerer kode som må endres til å bruke de nye utility-modulene. 

# E. Risikoer og TODOer  
- **Nøyaktig API:** Vi antar Base44-klienten har `entities.FuelPrice.filter(query, sort, limit)`. Hvis ikke, må `fuelPriceQueries.js` justeres (se TODO-kommentarer).  
- **UI-etiketter:** Vi har ikke flyttet `fuelTypeLabel` eller `sourceLabel` til utils; disse er UI-relatert. Det påvirker ikke dataflyt, men de dupliserte kartene kan vurderes slått sammen senere.  
- **RecentPricesFeed:** Den bruker manuelt filter istedenfor `fuelPriceEligibility`. Hvis vi endrer dette, må vi verifisere at samme elementer inkluderes/ekskluderes. Foreløpig dekker ikke `fuelPriceQueries` global filter, så det kan vente til senere.  
- **Ingen sletting:** Vi fjerner ikke gammel kode enda; vi erstatter kallene i komponentene med `import`er. Inline-logrikk kan merkes med TODO-kommentar før sikker sletting etter deploy.  
- **Mermaid-diagram:** For visuell oversikt kan vi legge inn en flytskjema. (Valgfritt om Copilot støtter dette.)
