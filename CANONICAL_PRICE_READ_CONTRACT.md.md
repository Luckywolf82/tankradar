# Canonical Station-Price Read Contract for AI Agents

This file governs all AI-assisted changes touching station-price READ logic in TankRadar.

## Scope

This is NOT:
- a feature task
- a broad cleanup pass
- a business-rule change
- a matching-engine task
- a threshold-tuning task

This IS:
- a repository rule for how station-price reads must be implemented

## Canonical read chain

All station-price reads must flow through this chain:

1. `src/utils/fuelTypeUtils.js`
2. `src/utils/fuelPriceQueries.js`
3. `src/utils/fuelPriceEligibility.js`
4. `src/utils/currentPriceResolver.js`

## Required shared functions

### Fuel normalization
Use:
- `normalizeFuelType(input)`
- `getFuelTypeLabel(fuelType)` where shared fuel labels are needed

Do not create:
- `normalizeFuel(...)`
- local alias maps for query behavior
- inline selectedFuel -> fuelType conversion

### FuelPrice query shape
Use:
- `fetchFuelPricesByStation({ stationId, limit })`
- `fetchFuelPricesByStationAndFuel({ stationId, selectedFuel, limit })`
- `fetchFuelPricesByStationsAndFuel({ stationIds, selectedFuel, limit })`
- `fetchRecentRealisticFuelPrices({ limit })` where appropriate

Do not create:
- inline `base44.entities.FuelPrice.filter(...)` in station-price display components
- custom query shapes in components
- hidden fallback to other data granularities

### Display eligibility
Use:
- `isStationPriceDisplayEligible(priceRow, options)`

Do not create:
- inline plausibility filters
- inline aggregate-price exclusions
- inline excluded match-status checks
- private “showable price” logic

### Latest/current resolution
Use:
- `resolveLatestPerStation(eligibleRows)`
- `resolveLatestPerFuelType(eligibleRows)`
- `isFreshEnoughForNearbyRanking(priceRow)`

Do not create:
- inline latest-row logic
- inline per-station grouping for current-price display
- inline freshness logic

## Strict vs soft views

### NearbyPrices
This is the stricter view.
It may continue using:
- `requireMatchedStationId: true`
- `isFreshEnoughForNearbyRanking(...)`

Do not silently relax Nearby behavior.

### StationDetails
This is the softer view.
It may continue showing the last known eligible price even when stale.

Do not silently make StationDetails behave like Nearby.

## Required workflow before any change

1. Read the actual repository files first
2. Identify any duplicate read logic
3. Reuse canonical modules
4. Extend shared modules only when necessary
5. Replace usage before deleting old logic
6. Keep business behavior unchanged unless explicitly approved in a separate task

## Forbidden patterns

The following are forbidden in new or updated station-price read code:

- inline `normalizeFuel`
- inline fuel alias maps for query behavior
- inline `base44.entities.FuelPrice.filter(...)` in display components
- inline eligibility logic
- inline latest-per-station logic
- inline latest-per-fuelType logic
- inline freshness windows
- silent fallback across data granularities
- duplicate business rules outside shared modules

## Relevant call sites to inspect before editing

- `src/components/dashboard/NearbyPrices.jsx`
- `src/pages/StationDetails.jsx`
- `src/components/dashboard/RecentPricesFeed.jsx`

## Required report format for AI-generated changes

A. Files read  
B. Duplicate logic found  
C. Canonical contract decided  
D. Files changed  
E. Behavior preserved  
F. Risks or unresolved mismatches  
G. Locked file verification  

## Success criteria

A station-price read task is only complete when:

- all touched station-price reads use the canonical chain
- no business behavior changed
- no locked files were modified
- no new inline normalization/query/eligibility/latest logic was introduced
- Nearby strictness remains intact
- StationDetails soft behavior remains intact
- no silent fallback was introduced
