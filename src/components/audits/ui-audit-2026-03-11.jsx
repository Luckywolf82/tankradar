# TankRadar UI Audit
**Date:** 2026-03-11  
**Scope:** Comprehensive UI/UX review across all user-facing pages and components  
**Status:** Documentation only — no code changes implemented yet

---

## Files Inspected

**Pages:**
- `pages/Dashboard.jsx`
- `pages/Statistics.jsx`
- `pages/PriceAlerts.jsx`
- `pages/Profile.jsx`
- `pages/LogPrice.jsx`

**Dashboard Components:**
- `components/dashboard/RadarCard.jsx`
- `components/dashboard/NearbyPrices.jsx`
- `components/dashboard/ActiveAlertsPreview.jsx`
- `components/dashboard/PriceDistribution.jsx`
- `components/dashboard/RegionalStats.jsx`
- `components/dashboard/HistoricalSSBTrend.jsx`
- `components/dashboard/QuickReportCard.jsx`
- `components/dashboard/ContributionImpactCard.jsx`
- `components/dashboard/RouteSavingsCard.jsx`

**Layout:**
- `Layout.jsx`
- `components/profile/PrivacySettings.jsx`
- `components/logprice/` (multiple sub-components)

**Navigation & Mobile:**
- `components/mobile/MobileHeader.jsx`
- `components/mobile/RouteAnimation.jsx`
- `components/mobile/PullToRefresh.jsx`
- `components/mobile/TabStateProvider.jsx`

---

## Current UI Architecture Summary

### Navigation Structure
- **Desktop:** Top nav with logo + core links (Oversikt, Statistikk, Logg pris, Profil) + role-specific links (Admin/Review)
- **Mobile:** Bottom nav with 4–5 items, mobile header with back button for secondary pages
- **Clean separation:** Main pages vs. detail/admin pages

### Dashboard Layout (Post-Entry 79)
```
PumpModeCard (proximity detection — suppresses other cards)
  ↓ conditional
SubmitPriceCard (legacy visible when PumpMode inactive)
"Logg pris" button (primary CTA — redundant with SubmitPrice)
DashboardGrid:
  ├─ RadarCard → NearbyPrices
  └─ ActiveAlertsPreview
```

**Issues identified:**
1. **Button redundancy:** Three UI surfaces for price submission (SubmitCard + button + Pump Mode)
2. **Conditional layout:** PumpMode suppressing other cards creates cognitive load
3. **Alert preview:** Now improved (Entry 79) but primary CTA button still weak

### Statistics Layout
```
Header (Statistikk)
Fuel type selector (Bensin 95, 98, Diesel)
HistoricalSSBTrend (line chart)
PriceDistribution (bar chart)
RegionalStats (table)
Data footnote
```

**Issues identified:**
1. **Data source transparency:** PriceDistribution shows GooglePlaces-only data without explicit label
2. **Sample size clarity:** RegionalStats marks weak samples as "lavt" but inline, easy to miss
3. **No cross-filtering feedback:** Charts update when fuel type changes, but no visual confirmation all updated together

### LogPrice Flow (5-step process)
```
Station Selection → Photo Capture → Price Confirmation → Submit → Success
```

**Strengths:**
- Clear step progression
- Station matching with candidate review
- AI-powered price detection

**Issues identified:**
1. **Metadata explosion:** 12 fields in stationInfo state, complex metadata attachment
2. **Error handling:** Submission error shown but optimistic success already displayed
3. **Repeat action:** "Repeat on same station" is good UX but state management complex

### Profile & Settings
```
Account info card
Contribution card
Privacy settings component
App links (PriceAlerts, Settings, Logout)
Admin shortcuts (conditional)
```

**Issues identified:**
1. **Admin shortcuts:** Separate amber-themed card; could be less prominent
2. **Contribution tracking:** Counts from created_by, not reportedByUserId
3. **Settings link:** Points to separate Settings page (not inspected in this audit)

---

## Visual Consistency Issues

### Spacing Inconsistencies
1. **Card padding:** Varies between p-3, p-4, px-4 py-3, etc.
2. **Section margins:** Mix of mb-4, mb-5, mb-6, space-y-4
3. **Button sizing:** Some btn-sm with h-8, others h-10
4. **Typography gaps:** Some text-xs/text-sm used inconsistently across similar contexts

### Color Usage
1. **Greens:** Multiple shades (green-100, green-50, green-600, green-700) — should standardize
2. **Blues:** Inconsistent (blue-600, blue-100, bg-blue-50) across cards
3. **Slate:** Over-used for secondary text (slate-500, slate-400, slate-600)
4. **Status badges:** Redundant patterns (green/red for status vs. chart colors)

### Card Layout Variations
1. **Shadow:** `shadow-sm` used everywhere — no hierarchy with larger cards
2. **Border:** Inconsistent use of border-colored left borders (border-l-4 on blue card, not others)
3. **Background:** Some cards have color gradients, others plain white
4. **Rounded:** All use `rounded-lg`/`rounded-xl` but no consistent pattern

### Button Styles
1. **Button variants:** Mix of `bg-green-600 hover:bg-green-700` and `variant="outline"`
2. **Button sizes:** sm/md/default sizes not consistently applied
3. **Icon buttons:** Inconsistent padding and sizing (py-1.5 vs. py-2.5)

### Typography
1. **Font weight:** Random mix of font-semibold, font-bold, font-medium across similar elements
2. **Size hierarchy:** h1 → p.text-xl → p.text-base inconsistent
3. **Line height:** Not explicitly controlled in most places
4. **Truncation:** Some long text uses truncate, some wraps

---

## Structural Issues

### Component Responsibility
1. **Dashboard.jsx**: Main page is simple, but delegates to many sub-components (good)
   - However: 3 price-submission entry points (SubmitCard, PumpMode, "Logg pris" button)

2. **QuickReportCard.jsx**: 300+ lines, handles station selection + fuel selection + price input in one component
   - Could be split: StationPicker (logic) + FuelSelector (UI) + PriceInput (UI)

3. **LogPrice.jsx**: 350+ lines, handles 5 major steps + station matching + image upload + AI detection
   - Currently: all state in one component
   - Better: break into StepContainer + individual step components

### Code Duplication
1. **Haversine calculation:** Exists in QuickReportCard.jsx, RouteSavingsCard.jsx, NearbyPrices.jsx
   - Should be a shared utility function

2. **Fuel type labels:** Defined in multiple places:
   - fuelTypeLabel in NearbyPrices.jsx
   - fuelTypeLabel in LogPrice.jsx
   - fuelTypeLabels in PriceAlerts.jsx
   - Should be centralized in utils or constants

3. **Source badges:** sourceLabel object in NearbyPrices.jsx, similar pattern elsewhere
   - Candidates for consolidation

### Missing Reusable Components
1. **Form inputs:** No standard form component library; using raw `<input>` in multiple places
2. **Alert states:** "Loading", "Empty", "Error" patterns repeated across pages (could be compound component)
3. **Data tables:** RegionalStats renders raw divs; could use a standardized table component
4. **Empty states:** Generic "Ingen data" text; could have consistent empty state UI

### Layout Inconsistencies
1. **Responsive behavior:** Max-width sometimes `max-w-4xl`, sometimes `max-w-6xl`, sometimes `max-w-xl`
2. **Page padding:** Sometimes `p-4 md:p-8`, sometimes `p-4 md:p-6`
3. **Card layout:** Sometimes in DashboardGrid, sometimes raw divs with space-y

---

## UX Issues

### Navigation & Discovery
1. **Notifications page:** Linked from NotificationBell only; no prominent Dashboard CTA
2. **PriceAlerts management:** CTAs scattered (Dashboard preview → PriceAlerts page → form)
3. **Admin tools:** Only visible in Profile page; hard to discover for admins
4. **Settings page:** Exists but not fully explored in this audit

### Clarity Issues
1. **"Logg pris" button on Dashboard:** Duplicates SubmitPriceCard functionality; confusing affordance
2. **PumpMode activation:** When active, user loses quick-report option (no visual hint to deactivate)
3. **PriceDistribution chart:** Only shows GooglePlaces data; user may assume all prices shown
4. **RegionalStats weak samples:** "· lavt" notation easy to miss; could be more prominent warning

### Loading States
1. **NearbyPrices:** "Henter posisjon og priser…" conflates two sequential operations
   - GPS → Data load are separate concerns
   - User doesn't know which step is blocking

2. **LogPrice photo confirmation:** Spinner shows while AI detection runs; user must wait but no clear messaging

3. **Form submissions:** Optimistic success shown immediately; error overlay appears after if needed (confusing order)

### Empty States
1. **ActiveAlertsPreview:** Now has CTA button (Entry 79); good improvement
2. **PriceAlerts page:** Shows generic "Ingen områdevarsler opprettet ennå."
3. **NearbyPrices:** "Ingen priser funnet i nærheten" vs. "For lite datagrunnlag" (two different states, clear)
4. **RegionalStats/PriceDistribution:** Generic "Ingen data" messages

### Information Architecture
1. **Account info** (Profile):
   - Full name shown (but often missing)
   - Role shown but unclear what roles mean
   - Contribution count shown but unclear what this leads to

2. **Alerts system:**
   - PriceAlerts (geographic regions) + UserPriceAlert (deprecated) — user unaware of this distinction
   - Triggered alerts go to Notifications page (separate from PriceAlerts management)
   - Two different alert concepts mixed in code but unclear in UI

3. **Price submission:**
   - SubmitPriceCard (idle state)
   - PumpModeCard (proximity-triggered)
   - LogPrice page (full flow)
   - "Logg pris" button
   - Four different entry points to same data model (confusing)

---

## Data Integrity Concerns

### Transparency Issues
1. **PriceDistribution (line 11):** Filters to `p.sourceName === "GooglePlaces"` but chart title just says "Prisfordeling"
   - **KOMPROMISS detected:** User sees price distribution without knowing data source is limited to GooglePlaces
   - **Fix:** Add subtitle: "GooglePlaces-data · {count} observasjoner" or similar

2. **RegionalStats:** Mixes station-level and regional data without clear distinction
   - Some prices from station, some aggregated; no label clarifying

3. **NearbyPrices:** Shows only "station_level + user_reported" prices
   - National average never shown (good)
   - But no transparency about why certain prices are hidden

### Metadata Complexity
1. **LogPrice.jsx (stationInfo):** 12 fields for metadata, complex state management
   - Many fields unused in UI but persisted for matching logic
   - Could confuse maintainers about required vs. optional fields

2. **FuelPrice creation:** rawPayloadSnippet contains concatenated metadata
   - Intended for debugging; not a scalable approach
   - Should use structured fields instead of string encoding

---

## Quality of Life Issues

### Mobile Experience
1. **Bottom nav:** 4–5 items; good density
2. **Pull-to-refresh:** Implemented; good touch affordance
3. **Responsive tables:** RegionalStats table works but small numbers hard to read on mobile
4. **Chart height:** Statistics charts fit well on mobile but may require scroll

### Accessibility
1. **Color contrast:** Should audit (not measured in code)
2. **Icon labels:** Many icon buttons have title attributes (good)
3. **Focus states:** Button focus rings not visible in code review
4. **Keyboard nav:** Complex modals (station picker, fuel selector) may not be keyboard accessible

### Performance Considerations
1. **Chart rendering:** Recharts charts render every time; no memoization visible
2. **Data fetching:** Statistics page fetches 1000 prices, 200 SSB records, 2000 stations simultaneously
3. **Images:** No image optimization mentioned (LogPrice photo capture)

---

## Candidate Cleanup Passes

### Pass A: Data Transparency Quick Fix
**Scope:** Add explicit data source labels where data is filtered/limited  
**Files affected:**
- `components/dashboard/PriceDistribution.jsx` — Add "GooglePlaces data only" label
- `components/dashboard/HistoricalSSBTrend.jsx` — Clarify "National average (SSB)"
- `components/dashboard/RegionalStats.jsx` — Improve weak-sample indicator

**Estimated risk:** LOW (UI text only, no logic changes)  
**Time:** 30 minutes  
**Impact:** High (fixes data integrity concerns)

---

### Pass B: Price Submission Entry Point Consolidation
**Scope:** Reduce 4 price-submission entry points to 2 (Dashboard quick + LogPrice full)  
**Changes:**
- Remove "Logg pris" button from Dashboard
- Replace SubmitPriceCard with unified UI that elegantly handles PumpMode + manual modes
- Clarify that LogPrice page is for detailed/photo-based submissions

**Files affected:**
- `pages/Dashboard.jsx` — Remove button
- `components/dashboard/SubmitPriceCard.jsx` — Redesign or remove
- `components/dashboard/QuickReportCard.jsx` — Enhance to handle all quick scenarios

**Estimated risk:** MEDIUM (changes interaction flow; needs UX testing)  
**Time:** 2–3 hours  
**Impact:** Medium (improves clarity, reduces cognitive load)

---

### Pass C: Component Architecture Refactor
**Scope:** Break down large components (QuickReportCard, LogPrice) into smaller, focused pieces  
**Changes:**
- Extract StationPicker logic from QuickReportCard
- Extract FuelSelector as standalone component
- Break LogPrice into: StepContainer + StepStation + StepPhoto + StepConfirm
- Centralize fuel type labels and source badges into utils

**Files affected:**
- `components/dashboard/QuickReportCard.jsx` — Refactor into 3 components
- `pages/LogPrice.jsx` — Refactor into 5 components
- Create `components/shared/FuelTypeUtils.js` — Centralized constants
- Create `components/shared/SourceBadge.jsx` — Reusable badge

**Estimated risk:** MEDIUM (refactor risk; requires careful testing)  
**Time:** 4–5 hours  
**Impact:** High (improved maintainability, reduced duplication)

---

### Pass D: Visual Consistency & Design System
**Scope:** Standardize spacing, colors, typography, and component patterns  
**Changes:**
- Define Tailwind spacing scale: xs/sm/md/lg/xl instead of arbitrary px values
- Standardize button variants (primary, secondary, ghost, danger)
- Centralize card styling (shadow, border, padding rules)
- Define typography scale (h1–h6, body, caption)
- Create design tokens CSS variables for colors

**Files affected:**
- `globals.css` — Add design token variables
- All `.jsx` files — Migrate to standardized class names
- `tailwind.config.js` — Add color palette + spacing system

**Estimated risk:** HIGH (wide scope; many files; regression risk)  
**Time:** 6–8 hours  
**Impact:** High (professional appearance; maintainability)

---

### Pass E: Loading State & Error Handling Clarity
**Scope:** Improve messaging for GPS, data loading, form submission, and errors  
**Changes:**
- Split NearbyPrices loading message into two stages (GPS pending, then data loading)
- Show form submission errors *before* showing success (not overlay)
- Add status badges for chart loading states
- Create unified error component

**Files affected:**
- `components/dashboard/NearbyPrices.jsx` — Enhanced loading states
- `pages/LogPrice.jsx` — Reorder success/error display
- `components/logprice/ConfirmPrice.jsx` — Better error messaging
- Create `components/shared/ErrorState.jsx` — Reusable error component

**Estimated risk:** LOW-MEDIUM (localized changes, good UX payoff)  
**Time:** 2–3 hours  
**Impact:** Medium (improves user confidence in app reliability)

---

## Recommended Next Cleanup Pass

### **🎯 Pass A: Data Transparency Quick Fix**

**Why this is the best choice:**

1. **Highest governance alignment:** Directly addresses "KOMPROMISS" rule (explicit data source disclosure)
2. **Lowest risk:** UI text only; no logic or data model changes
3. **Immediate impact:** Fixes data integrity concern without architectural debt
4. **Fastest ROI:** 30 minutes implementation for high-value fix
5. **No dependencies:** Can be done immediately without blocking other work
6. **Single file focus:** `PriceDistribution.jsx` (+ optional improvements to Stats)

**Specific changes:**
- Add subtitle to PriceDistribution: "GooglePlaces-observasjoner · {count} stasjoner"
- Update HistoricalSSBTrend subtitle: Clarify "Nasjonalt snitt (SSB)"
- Improve RegionalStats weak-sample indicator: Make "· lavt" more prominent or add tooltip

**After completion:** UI will be compliant with data transparency rule, and "silent fallback" KOMPROMISS will be documented.

---

## Governance Safety Confirmation

✓ **This audit does NOT:**
- Modify backend logic
- Change matching engine code
- Alter data model/entities
- Touch locked Phase 2 files
- Implement any code changes

✓ **This audit is documentation only:**
- Stored in `components/audits/` per AUDIT_STORAGE rule
- Persisted in repository for future review
- Identifies issues without implementing solutions
- Recommends priorities for next steps

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Files inspected | 25+ |
| Pages reviewed | 5 |
| Major components | 20+ |
| Visual consistency issues | 12 |
| Structural issues | 8 |
| UX issues | 10 |
| Data integrity concerns | 3 |
| Recommended cleanup passes | 5 |
| Recommended priority pass | 1 |

---

**Audit prepared by:** AI Agent  
**Audit status:** Ready for user review and prioritization  
**Next action:** User approval to implement Pass A or alternative selection