# 📱 UI AUDITS

This folder contains audits of user interface, visual consistency, navigation clarity, mobile experience, component design, and data transparency in the UI.

---

## 🎯 What Belongs Here

UI audits examine **visible, user-facing** aspects of the application:

- **Layout & Responsiveness:** Dashboard grid, mobile nav, responsive breakpoints, page structure
- **Visual Consistency:** Colors, typography, spacing, button styles, card designs, shadows
- **Navigation & Discovery:** Top nav, bottom nav, links, menus, how users find features
- **Component Design:** Button variants, form inputs, modals, alerts, badges
- **Data Presentation:** Chart labeling, table layouts, data source transparency, empty states
- **Loading & Error States:** Spinners, skeletons, error messages, progress indicators
- **Mobile UX:** Touch affordance, bottom nav, pull-to-refresh, mobile-specific interactions
- **Accessibility:** Color contrast, icon labels, focus states, keyboard navigation
- **Information Architecture:** Content hierarchy, page organization, user mental models

---

## 🚫 What Does NOT Belong Here

Architecture and code structure issues → See `architecture/`  
Governance and Phase lock verification → See `governance/`  
Backend function organization → See `architecture/`  
Entity relationships → See `architecture/`

---

## 📋 Standard Audit Sections

### 1. Files Inspected
List all pages and components reviewed.

**Example:**
```
**Pages:**
- pages/Dashboard.jsx
- pages/LogPrice.jsx
- pages/Statistics.jsx

**Components:**
- components/dashboard/PriceDistribution.jsx
- components/dashboard/ActiveAlertsPreview.jsx
- components/mobile/MobileHeader.jsx
```

---

### 2. Current UI Architecture Summary

Describe how the UI is currently organized. Include:
- Navigation structure (desktop vs. mobile)
- Major page layouts
- Key components and their relationships
- Current user flows

**Example:**
```
### Navigation Structure
- Desktop: Top nav with logo + core links + role-specific links
- Mobile: Bottom nav with 4–5 items, mobile header with back button

### Dashboard Layout
PumpModeCard (proximity detection)
  ↓ conditional
SubmitPriceCard (legacy)
DashboardGrid:
  ├─ RadarCard → NearbyPrices
  └─ ActiveAlertsPreview
```

---

### 3. Visual Consistency Issues

Document inconsistencies in:
- **Spacing:** Margin/padding variations (mb-4 vs mb-5)
- **Colors:** Multiple shades of same color (green-100, green-50, green-600)
- **Typography:** Font weights, sizes, line heights
- **Buttons:** Variant styles, sizing, hover states
- **Cards:** Shadows, borders, backgrounds, border radius
- **Responsive:** Max-width, breakpoint behavior

**Example:**
```
### Spacing Inconsistencies
- Card padding varies: p-3, p-4, px-4 py-3
- Section margins mix: mb-4, mb-5, mb-6, space-y-4
- Button sizing: sm (h-8) vs default (h-10)

### Color Usage
- Greens: green-100, green-50, green-600, green-700 — should standardize
- Blues: inconsistent across cards
```

---

### 4. Structural Issues (Component Organization)

Document problems with:
- Component size and responsibility (e.g., 300+ line components)
- Code duplication (e.g., haversine calculation in 3 places)
- Missing reusable components (e.g., form inputs, empty states)
- Layout inconsistencies (max-width, padding, responsive patterns)

**Example:**
```
### Component Responsibility
- LogPrice.jsx: 350+ lines, handles 5 major steps + image upload + AI detection
  Suggestion: Break into StepContainer + individual step components

### Code Duplication
- Haversine calculation: QuickReportCard.jsx, RouteSavingsCard.jsx, NearbyPrices.jsx
  Suggestion: Centralize in utility function
```

---

### 5. UX & Clarity Issues

Document confusing or unclear interactions:
- Navigation discovery (hard to find features)
- Affordance problems (unclear what elements do)
- Loading state messaging
- Error handling clarity
- Empty state messaging
- Information hierarchy

**Example:**
```
### Navigation & Discovery
- Notifications page only linked from bell icon; no Dashboard CTA
- Admin tools only visible in Profile page; hard for admins to discover

### Clarity Issues
- "Logg pris" button duplicates SubmitPriceCard functionality
- PriceDistribution chart only shows GooglePlaces data but doesn't label this explicitly
```

---

### 6. Data Integrity & Transparency Issues

Document where UI fails to explain data sources, limitations, or assumptions:
- **Silent fallbacks:** Using national average when local prices missing
- **Source attribution:** Charts/stats not labeled with data source
- **Metadata complexity:** Too many fields in state; confusing what's required
- **Data quality signals:** Weak samples not clearly marked

**Example:**
```
### Transparency Issues
- PriceDistribution (line 11): Filters to GooglePlaces only but title just says "Prisfordeling"
  **KOMPROMISS detected:** User sees price distribution without knowing data source is limited
  Fix: Add subtitle "GooglePlaces-data · {count} observasjoner"
```

---

### 7. Candidate Cleanup Passes

Propose 2–3 concrete options, each with:
- **Scope:** What will be changed
- **Files affected:** Which files to modify
- **Risk level:** LOW / MEDIUM / HIGH
- **Effort estimate:** Time required
- **Impact:** How much improvement

**Example:**
```
### Pass A: Data Transparency Quick Fix
- Scope: Add explicit data source labels where data is filtered
- Files: PriceDistribution.jsx, HistoricalSSBTrend.jsx, RegionalStats.jsx
- Risk: LOW (UI text only)
- Time: 30 minutes
- Impact: HIGH (fixes data integrity concerns)

### Pass B: Price Submission Consolidation
- Scope: Reduce 4 submission entry points to 2
- Files: Dashboard.jsx, SubmitPriceCard.jsx, QuickReportCard.jsx
- Risk: MEDIUM (changes interaction flow)
- Time: 2–3 hours
- Impact: MEDIUM (improves clarity)
```

---

### 8. Recommended Action

Pick the strongest option and explain why:
- Why this pass over others?
- What dependencies exist?
- What could block it?

**Example:**
```
🎯 **Recommended: Pass A — Data Transparency Quick Fix**

Why:
1. Highest governance alignment (KOMPROMISS rule)
2. Lowest risk (UI text only)
3. Fastest ROI (30 minutes for high-value fix)
4. No dependencies — can start immediately
```

---

### 9. Governance Safety Confirmation

Confirm:
- ✓ No frozen files touched
- ✓ No backend logic modified
- ✓ No data model changes
- ✓ No product features implemented
- ✓ Audit is documentation-only

**Example:**
```
✓ This audit does NOT:
- Modify backend logic or matching engine
- Change data model or entities
- Touch frozen Phase 2 files
- Implement any code changes

✓ This audit is documentation-only:
- Stored in components/audits/ per AUDIT_STORAGE rule
- Persisted for future review
- Recommends priorities without implementing
```

---

## 📊 Summary Statistics (Optional)

Include counts for context:

```
| Metric | Count |
|--------|-------|
| Pages reviewed | 5 |
| Components inspected | 20+ |
| Visual consistency issues | 12 |
| Structural issues | 8 |
| UX clarity issues | 10 |
| Proposed cleanup passes | 5 |
```

---

## 📄 File Naming

Save UI audits with this naming pattern:

`{descriptor}-ui-audit-YYYY-MM-DD.md`

**Examples:**
- `ui-audit-2026-03-11.md` — General UI audit
- `dashboard-ui-audit-2026-03-11.md` — Dashboard-specific audit
- `mobile-ux-ui-audit-2026-03-11.md` — Mobile experience audit

---

## ✅ Checklist Before Saving

- [ ] All 9 sections included
- [ ] Issues are prioritized (CRITICAL → LOW)
- [ ] 2+ cleanup options provided with risk assessment
- [ ] Recommended action has clear justification
- [ ] Governance safety section confirms document-only
- [ ] File paths accurate and in backticks
- [ ] Summary statistics included
- [ ] Saved in `ui/` folder with correct filename

---

**Category:** UI & User Experience  
**Format:** Markdown (`.md`)  
**Last updated:** 2026-03-11