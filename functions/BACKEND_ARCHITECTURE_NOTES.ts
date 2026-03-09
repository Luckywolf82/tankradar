/**
 * BACKEND-LAG PRESISERINGER OG SIKKERHETSDOKUMASJON
 * 
 * Denne filen dokumenterer kritiske designbeslutninger og kjente risikofaktorer.
 * Den er ikke en eksekverbar funksjon, bare dokumentasjon.
 */

/* 
================================================================================
1. ALERT-VALIDERING (BETINGET THRESHOLD)
================================================================================

Implementert i: createUserPriceAlert.js

LOGIKK:
- below_user_target → threshold REQUIRED
- price_drop → threshold REQUIRED  
- below_national_average → threshold NOT required
- new_low_7d → threshold NOT required
- new_low_30d → threshold NOT required

Feilhåndtering: Returner 400 hvis threshold-krav ikke oppfylt for relevant alertType.
*/

/*
================================================================================
2. SENTRALISERT FREEMIUM-LOGIKK
================================================================================

SANNHETSKILDE: checkFreemiumLimits.js

BRUKT I (via base44.functions.invoke):
✓ addUserFavoriteStation.js
✓ getFuelDashboardData.js

UNNGÅR:
✗ Hardkodede grenser flere steder
✗ Inkonsistente regler per funksjon

GRENSER:
  Gratisbruker:
  - maxFavorites: 3
  - maxHistoryDays: 30
  - canCreateAlerts: false
  - canAccessRegionalBenchmark: false
  
  Premiumbruker:
  - maxFavorites: 999999
  - maxHistoryDays: 365
  - canCreateAlerts: true
  - canAccessRegionalBenchmark: true
*/

/*
================================================================================
3. IDENTITETSGRUNNLAG FOR created_by
================================================================================

BASE44 OPPFØRSEL:
- created_by er automatisk satt når bruker oppretter record
- Verdien er brukerens EMAIL-ADRESSE (fra user.email)
- Base44 validerer automatisk at created_by matcher innlogget bruker

⚠️  KRITISK RISIKO — E-POSTENDRING:
Hvis bruker endrer e-post fra old@example.com → new@example.com:
  • Gamle favoritter/alerts: created_by = old@example.com
  • Nye favoritter/alerts: created_by = new@example.com
  • Resultat: BRUKER SER IKKE SINE GAMLE FAVORITTER

LØSNINGSVALG:
A) Implementer migrering ved e-postendring (bakgrunn-task)
B) Dokumenter at favoritter IKKE overføres ved e-postendring
C) Feature request til Base44: Bruk stabilt bruker-ID i stedet for e-post

ANBEFALING: Valg B (dokumenter limitasjon) for MVP. Valg C (feature request) senere.
*/

/*
================================================================================
4. DUPLIKATVERN — IKKE ATOMISK PÅ DATABASE-NIVÅ
================================================================================

KJENT RISIKO:

Race condition scenario:
  T1: Request A - filter() → tom liste (duplikat ikke funnet)
  T2: Request B - filter() → tom liste (duplikat ikke funnet)
  T3: Request A - create() → suksess
  T4: Request B - create() → suksess
  
  RESULTAT: To identiske favoritter opprettet (duplikat!)

ROOT CAUSE:
- filter() + create() er IKKE atomisk
- Base44 mangler uniqueness constraint på (created_by, station, fuelType)
- Database-nivå constraint ville stoppet dette automatisk

LØSNINGSVALG:

VALG A: FRONTEND DEBOUNCE (ANBEFALT FOR MVP)
  Blokker parallelle submits med isCreating flag
  Enkelt å implementere, effektivt for UI-level race conditions
  
  const [isCreating, setIsCreating] = useState(false);
  
  const handleAdd = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await base44.functions.invoke('addUserFavoriteStation', {...});
    } finally {
      setIsCreating(false);
    }
  };

VALG B: BACKEND IDEMPOTENCY (IKKE IMPLEMENTERT)
  Legg externalRequestId på hver request
  Cache svar i 5 minutter
  Return cached svar hvis samme ID kommer igjen
  Kompleks, men fullstendig sikring

VALG C: DATABASE CONSTRAINT (FEATURE REQUEST TIL BASE44)
  Legg unique constraint på:
  - UserFavoriteStation: (created_by, station, fuelType)
  - UserPriceAlert: (created_by, station, fuelType, alertType)
  Beste langsiktig løsning

IMPLEMENTERING PLAN:
  ✓ MVP: Implementer Valg A (frontend debounce) før UI-lansering
  ⚠️ TODO: Feature request til Base44 for Valg C
  ⚠️ MONITOR: Duplikat-rate i produksjon, vurder Valg B hvis nødvendig

================================================================================
AI PROJECT INSTRUCTIONS v1.0 — FIRE MINI-PATCHES
================================================================================

PATCH 1: NYE REVIEW-TYPER KREVER EKSPLISITT GOVERNANCE-OPPDATERING

StationReview brukes TIL:
  ✓ Station-mastering (navn, chain, duplikat-slåing)
  ✓ Klassifiseringsavvik (innen eksisterende governance-typer)
  ✓ Manuelle avklaringer

REGEL: Nye review-typer skal IKKE innføres uten eksplisitt oppdatering av
governance-dokumentene. Hvis ny review_type skal legges til:
  1. Definer governance-regler
  2. Oppdater dokumentasjon
  3. Oppdater entity-schemat (StationReview.review_type enum)
  4. Implementer logikk
  5. Test med representativt datasett
  6. Dokumenter resultat

INGEN UNNTAK — dette er ikke åpent for fortolking.

================================================================================
PATCH 2: REPORTEDBYUSERID SETTES NÅR TILGJENGELIG

FuelPrice.reportedByUserId:
  • Settes når pris rapporteres av innlogget bruker
  • Settes til null hvis bruker ikke er innlogget
  • ALDRI eksponert offentlig i MVP
  • Grunnlag for fremtidig gamification (ikke implementert ennå)

Mer robust enn: "kun satt for innloggede brukere" fordi det er mindre binært.

================================================================================
PATCH 3: AI SHALL PREVIEW BEFORE APPLY

Når endring påvirker mange records eller sentrale pipelines:
  1. Be om preview/plan før apply
  2. Vis eksempler på hva som endres
  3. Få eksplisitt godkjenning før implementering

Gjelder: bulk-klassifisering, matching-endringer, datamigrering, parser-config

Dette er gjennomgående styringsprinsipp — må være del av AI-agentrammer.

================================================================================
PATCH 4: KONSISTENTE FILREFERANSER

ALLE frossen files og andre kildehente-referanser bruker .js-ending:
  • functions/classifyStationsRuleEngine.js
  • functions/classifyGooglePlacesConfidence.js
  • functions/classifyPricePlausibility.js
  • functions/deleteAllGooglePlacesPrices.js
  • functions/deleteGooglePlacesPricesForReclassification.js
  • functions/verifyGooglePlacesPriceNormalization.js

Unngår forvirring og sikrer korrekt referering.

================================================================================
OPPSUMMERING
================================================================================

| Punkt | Status | Handling |
|-------|--------|----------|
| Betinget threshold | ✓ Implementert | createUserPriceAlert validerer per type |
| Sentralisert freemium | ✓ Implementert | Alle funksjoner bruker checkFreemiumLimits |
| created_by = email | ⚠️ Risiko | Dokumenter e-postendring-begrensning |
| Duplikatvern | ⚠️ Race condition | Implementer frontend debounce før lansering |
| Nye review-typer | ✓ LOCKED | Krever governance-oppdatering (PATCH 1) |
| reportedByUserId | ✓ LOCKED | Settes når tilgjengelig (PATCH 2) |
| Preview før apply | ✓ LOCKED | Påkrevd for store endringer (PATCH 3) |
| Filreferanser | ✓ LOCKED | Konsistente .js-endinger (PATCH 4) |

*/