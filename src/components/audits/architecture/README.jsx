# 🏗️ ARCHITECTURE AUDITS

This folder contains audits of code structure, routing design, component hierarchy, data flow, entity relationships, and system organization.

---

## 🎯 What Belongs Here

Architecture audits examine **structural and organizational** aspects of the codebase:

- **Routing & Initialization:** Router structure, page registration, entry points, nested routers
- **Page Organization:** How pages are discovered, auto-loaded, or explicitly imported
- **Component Hierarchy:** Component composition, responsibility, parent-child relationships
- **Data Flow:** Entity references, data pipeline, where data is fetched and how it flows
- **Code Organization:** File structure, folder organization, naming conventions
- **Code Duplication:** Repeated logic, missing abstractions, shared utilities
- **Layer Separation:** UI layer, business logic, data access, clear boundaries
- **Dependencies:** Import patterns, circular dependencies, dependency injection
- **Patterns & Conventions:** Where the code follows or violates established patterns
- **Backend Functions:** Organization, naming, parameters, error handling

---

## 🚫 What Does NOT Belong Here

UI/UX and visual consistency → See `ui/`  
Governance and Phase lock verification → See `governance/`  
User-facing features and clarity → See `ui/`  
Visual design and styling → See `ui/`

---

## 📋 Standard Audit Sections

### 1. Files Inspected

List all files, components, systems, or directories examined.

**Example:**
```
**Core Files:**
- pages/App.jsx
- Layout.jsx
- components/auth/ProtectedRoute.jsx

**Page Files:**
- pages/Dashboard.jsx
- pages/SuperAdmin.jsx
- pages/StationDetails.jsx

**Component Structure:**
- components/dashboard/
- components/admin/
- components/shared/

**Configuration:**
- pages.config.js (if exists)
- vite.config.js (if relevant)
```

---

### 2. Current Architecture Summary

Describe the overall structure. Include:
- How the application initializes
- Main entry point(s)
- Router structure and page registration
- Key architectural layers
- Major data flows

**Example:**
```
### Application Initialization
- Root entry: Unknown (not found in initial search)
- Main router: pages/App.jsx contains BrowserRouter + Routes
- Layout: Layout.jsx wraps pages with navigation UI
- Auth: ProtectedRoute.jsx wraps protected pages

### Page Registration
- Public pages: Dashboard, Statistics, LogPrice, Settings
- Protected pages: Profile, ReviewQueue (curator+admin)
- Admin pages: SuperAdmin, SystemStatus, 15+ diagnostic pages

### Data Flow
- Base44 SDK for entities (base44.entities.*)
- Queries with React Query (@tanstack/react-query)
- Local state for UI ephemeral data
```

---

### 3. Component Structure & Organization

Document how components are organized:
- Where logic lives (pages vs. components)
- Component size and responsibility
- Component naming and location
- Parent-child relationships

**Example:**
```
### Component Organization
Dashboard.jsx (page) → DashboardGrid → RadarCard → NearbyPrices → Individual price items

LogPrice.jsx (page, 350+ lines):
  - Handles 5 major steps
  - Manages image upload
  - Integrates AI detection
  Suggestion: Break into smaller step components

QuickReportCard.jsx (300+ lines):
  - Station selection + fuel selection + price input
  Suggestion: Extract StationPicker, FuelSelector
```

---

### 4. Data Flow & Entity References

Document how data flows through the system:
- Which pages fetch which entities
- How data is passed between components
- Data mutation patterns
- Real-time subscription patterns

**Example:**
```
### Entity Flow
Dashboard.jsx
  ├─ Fetches: FuelPrice (nearby), UserPriceAlert (active)
  ├─ Subscribes: Real-time updates on FuelPrice
  └─ Calls: checkPriceAlerts() function

LogPrice.jsx
  ├─ Fetches: Station (nearby for matching)
  ├─ Creates: FuelPrice (with station match)
  └─ Optionally creates: StationCandidate (if unmatched)

SuperAdmin.jsx
  ├─ Lists: StationReview, StationCandidate, FetchLog
  └─ May trigger: Administrative mutations (reviewed by curators)
```

---

### 5. Code Duplication & Shared Logic

Document where logic is repeated:
- Utility functions that should be centralized
- Constants repeated in multiple places
- Similar patterns implemented differently

**Example:**
```
### Haversine Calculation
- QuickReportCard.jsx (line 45)
- RouteSavingsCard.jsx (line 78)
- NearbyPrices.jsx (line 102)
Suggestion: Move to utils/distance.js, import in all 3

### Fuel Type Labels
- fuelTypeLabel in NearbyPrices.jsx
- fuelTypeLabels in LogPrice.jsx
- fuelTypeLabel in PriceAlerts.jsx
Suggestion: Centralize in utils/fuelTypes.js or constants.js
```

---

### 6. Architectural Issues Found

Document structural problems:
- Missing abstractions
- Unclear separation of concerns
- Architectural anti-patterns
- Inconsistent organization

**Example:**
```
### Issue #1: Nested Router Conflict (CRITICAL)
- pages/App.jsx contains full BrowserRouter + Routes
- Likely auto-registered as `/app` page route
- Creates nested router error when accessed
- Root cause: Router logic placed as a page file

### Issue #2: Architectural Ambiguity (MEDIUM)
- No clear root App.jsx file found
- Unclear how application initializes
- Routing logic in pages/App.jsx vs. root is ambiguous
```

---

### 7. Candidate Cleanup Passes

Propose 2–3 structural changes, each with:
- **Procedure:** Step-by-step what to do
- **Files affected:** Which files to modify
- **Pros & Cons:** Advantages and disadvantages
- **Risk level:** LOW / MEDIUM / HIGH
- **Effort:** Time estimate

**Example:**
```
### Option A: Move pages/App.jsx Logic to Root
Procedure:
1. Locate actual root app shell
2. Copy route definitions to root App.jsx
3. Delete pages/App.jsx

Pros: Single clear router, standard structure
Cons: Requires identifying root App.jsx first
Risk: LOW (if root is found)
Time: 1–2 hours

### Option B: Rename to Prevent Auto-Registration
Procedure:
1. Rename pages/App.jsx → pages/_RouterConfig.jsx
2. Import in root level
3. Verify /app is no longer accessible

Pros: Non-destructive, quick fix
Cons: Leaves ambiguity about architecture
Risk: LOW
Time: 15 minutes
```

---

### 8. Recommended Action

Pick the strongest architectural path and explain why:

**Example:**
```
🎯 **Recommended: Option A — Move pages/App.jsx Logic to Root**

Why:
1. Eliminates nested router conflict (critical issue)
2. Establishes clear single root router
3. Standard application architecture
4. Long-term maintainability

Blocker: Must first locate actual root App.jsx file
Next step: Verify root shell initialization path
```

---

### 9. Governance Safety Confirmation

Confirm:
- ✓ No frozen files touched
- ✓ No feature implementation
- ✓ No data model changes
- ✓ No product behavior altered
- ✓ Audit is documentation-only

**Example:**
```
✓ This audit does NOT:
- Touch frozen Phase 2 files
- Implement routing fixes
- Change page behavior
- Add new features

✓ This audit is documentation-only:
- Identifies architectural issues
- Proposes multiple solutions
- No code changes made
```

---

## 📊 Summary Metrics (Optional)

Include relevant statistics:

```
| Aspect | Count |
|--------|-------|
| Pages examined | 25+ |
| Component files reviewed | 30+ |
| Duplication instances found | 5 |
| Architectural issues | 2 |
| Proposed refactor options | 3 |
```

---

## 📄 File Naming

Save architecture audits with this pattern:

`{descriptor}-architecture-audit-YYYY-MM-DD.md`

**Examples:**
- `architecture-audit-2026-03-11.md` — General architecture audit
- `routing-architecture-audit-2026-03-11.md` — Routing-focused audit
- `component-duplication-architecture-audit-2026-03-11.md` — Duplication audit

---

## ✅ Checklist Before Saving

- [ ] All 9 sections included
- [ ] Files inspected list is complete
- [ ] Architecture summary explains initialization clearly
- [ ] Issues are prioritized by severity
- [ ] 2+ cleanup options provided with risk/effort
- [ ] Recommended action justified
- [ ] Governance safety section confirms document-only
- [ ] All file paths accurate
- [ ] Summary metrics included (optional)
- [ ] Saved in `architecture/` folder with correct filename

---

## 🔍 Common Architecture Audit Topics

- **Routing Structure:** How pages are discovered and routed
- **Component Hierarchy:** Who owns what state, parent-child composition
- **Data Pipeline:** Where entities are fetched, mutations, subscriptions
- **Code Duplication:** Repeated logic that should be centralized
- **Layer Organization:** UI / business logic / data access separation
- **Backend Functions:** Organization, naming, error handling
- **Entity Flow:** Which pages use which entities, relationships

---

**Category:** Code Structure & Organization  
**Format:** Markdown (`.md`)  
**Last updated:** 2026-03-11