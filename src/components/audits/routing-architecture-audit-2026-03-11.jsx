# ROUTING ARCHITECTURE AUDIT — 2026-03-11

## Executive Summary

The TankRadar application has a **dual router configuration** that creates architectural inconsistency and potential runtime conflicts:

1. **`pages/App.jsx`** — Contains a complete BrowserRouter + Routes implementation with centralized role-based route protection
2. **Root app shell** — Unclear whether this is invoked or if pages/App.jsx is auto-registered as a normal page

This audit identifies the architectural issue, verifies its scope, and proposes cleanup options.

---

## Files Inspected

- `Layout.jsx` — Global layout wrapper (verified; no router logic)
- `pages/App.jsx` — Full routing implementation with ProtectedRoute wrapper
- `components/audits/README.jsx` — Audit format specification
- `pages/SuperAdmin.jsx` — Admin page with local auth defense-in-depth

---

## Current State Summary

### What We Found

1. **`pages/App.jsx` is a complete app shell:**
   - Contains `<BrowserRouter>` (line 99)
   - Contains full `<Routes>` definition (lines 100–106)
   - Defines `publicPages`, `userPages`, `curatorPages`, `adminPages` arrays
   - Uses `makeRoute()` helper to wrap protected routes in `<ProtectedRoute requiredRole={role}>`
   - Implements complete role-based access control (curator, admin-only)

2. **Root app shell is missing or not inspected:**
   - File lookup for `src/App.jsx` returned "File not found"
   - This suggests the app is either: (a) using `pages/App.jsx` as the main entry point, or (b) there's a root router file that wasn't located

3. **pages/App.jsx is likely auto-registered as a route:**
   - Pages in the `pages/` directory are typically auto-registered by Base44's convention
   - If `pages/App.jsx` is auto-registered, it creates a nested BrowserRouter at `/app` route
   - This causes the nested router error reported in the /app preview

4. **Layout.jsx is a layout wrapper, not a router:**
   - Used by `pages/App.jsx` to wrap page content
   - Provides navigation UI only; no routing logic

5. **SuperAdmin.jsx has local auth check:**
   - Lines 144–160: Redundant admin role check for defense-in-depth
   - This is safe but duplicates the centralized ProtectedRoute check

---

## Issues Found (Prioritized)

### Issue #1: CRITICAL — Nested BrowserRouter Conflict

**Problem:** If `pages/App.jsx` is auto-registered as a page route, it creates a second `<BrowserRouter>` inside the main router.

```
Root Router
  └── /app route
      └── BrowserRouter from pages/App.jsx (CONFLICT)
```

**Symptoms:**
- /app preview shows nested router error
- React Router throws "You must enclose your components in a <BrowserRouter>" or similar
- Navigation from within pages/App.jsx routes will conflict with parent router

**Impact:** HIGH — Runtime error on any access to `/app` route

**Root Cause:** pages/App.jsx contains routing logic that should be at the root level, but it's placed as a normal page file

---

### Issue #2: Architectural Ambiguity — Where is the Real Root Router?

**Problem:** No clear root `src/App.jsx` file found. It's unclear how the application initializes.

**Possible scenarios:**
1. Root App.jsx exists at a different path (not inspected)
2. pages/App.jsx IS the root router (unconventional but possible)
3. There's a separate entry point we haven't identified

**Impact:** MEDIUM — Maintenance risk; unclear architecture for future developers

---

### Issue #3: Duplicate Role-Based Protection Logic

**Problem:** `pages/App.jsx` implements centralized role-based protection via ProtectedRoute wrapper, but SuperAdmin.jsx also has local admin auth check.

**Location:** pages/SuperAdmin.jsx lines 144–160

**Assessment:** This is defense-in-depth (safe), not a bug. However, it duplicates logic that's already enforced at the route level.

**Impact:** LOW — Redundant but safe; no immediate fix required

---

## Proposed Cleanup Passes

### Option A: Move pages/App.jsx Logic to Root

**Procedure:**
1. Identify the actual root app shell (locate `src/App.jsx` or equivalent)
2. Copy route definitions from `pages/App.jsx` to the root App.jsx
3. Delete `pages/App.jsx` to prevent auto-registration as a page route

**Pros:**
- Eliminates nested router conflict
- Single, clear root router
- Standard application structure

**Cons:**
- Requires identifying root App.jsx first

**Governance Risk:** LOW — No Phase 2 files touched

---

### Option B: Rename pages/App.jsx to Prevent Auto-Registration

**Procedure:**
1. Rename `pages/App.jsx` to `pages/_RouterConfig.jsx` or similar (underscore prevents auto-registration)
2. Import RouterConfig at root level
3. Verify /app route is no longer accessible

**Pros:**
- Non-destructive; file still exists for reference
- Quick fix (1 rename + 1 import)
- Keeps route logic accessible

**Cons:**
- Doesn't establish clear architecture
- Still leaves ambiguity about root router location

**Governance Risk:** LOW

---

### Option C: Keep pages/App.jsx But Redirect /app Route

**Procedure:**
1. Add a catch-all redirect in root router: `/app → /dashboard`
2. Keep `pages/App.jsx` for documentation/reference only
3. Document why it exists and why it's not used

**Pros:**
- Non-destructive
- Prevents 404 on /app
- Clearly separates routing from pages

**Cons:**
- Confusing: code exists but isn't used
- Not a proper fix; masks the underlying issue

**Governance Risk:** MEDIUM — Creates dead code

---

## Recommended Action

**HOLD further routing changes until root App.jsx is located and verified.**

**Next steps (in order):**

1. **Locate the actual root app shell** — Find `src/App.jsx` or the file that imports and uses pages/App.jsx as the root component
   - Search for imports of BrowserRouter or main app entry point
   - Verify which file is passed to ReactDOM.render() or React 18 createRoot()

2. **Once root is identified:**
   - If pages/App.jsx is NOT referenced: Execute **Option A** (move logic to root, delete pages/App.jsx)
   - If pages/App.jsx IS imported at root: Execute **Option B** (rename to prevent auto-registration)
   - Document the decision in a follow-up audit

3. **Do NOT proceed with cleanup without verifying root architecture first**

---

## Governance Safety Confirmation

✓ **No Phase 2 frozen files accessed or modified**
✓ **No routing changes implemented (audit only)**
✓ **No deletions performed**
✓ **All recommendations marked as "hold pending verification"**
✓ **Audit follows HOVEDINSTRUKS Part 2 governance rules**

---

## Questions for Clarification (To Be Answered in Follow-Up)

1. Where is the actual root `src/App.jsx`? (File not found in initial search)
2. How is the application initialized? (Which file contains main entry point?)
3. Is `pages/App.jsx` auto-registered by Base44 page convention, or is it explicitly imported somewhere?
4. If pages/App.jsx is explicitly imported, at what level? (root App.jsx? vite.config.js?)
5. Can we confirm the /app route error is caused by nested BrowserRouter?

---

## Conclusion

The current dual-router architecture is **not sustainable**. The application needs either:
- A single root router (Option A recommended), or
- Clear documentation of why pages/App.jsx exists and isn't used (Option C fallback)

**Status:** AUDIT COMPLETE. Awaiting user verification of root app shell location before cleanup implementation.

**Recommended next step:** User confirms root app location → Proceed with Option A or Option B → Update execution log with cleanup confirmation