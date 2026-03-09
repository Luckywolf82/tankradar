/**
 * REPORTEDUSERID MVP LIMITATION — TECHNICAL DEBT RECORD
 * 
 * Status: Accepted MVP constraint pending future API-level hardening
 * 
 * ============================================================================
 * THE ISSUE
 * ============================================================================
 * 
 * The FuelPrice entity includes a `reportedByUserId` field for tracking
 * which authenticated user contributed user_reported price observations.
 * 
 * Current state:
 * - EXPOSED: Base44 SDK returns full entity records including reportedByUserId
 * - PROTECTED: UI layer and read-path discipline prevent public exposure
 * - RISK: Field is technically available in API responses to authenticated calls
 * 
 * ============================================================================
 * CURRENT SAFEGUARDS (UI/READ-PATH DISCIPLINE)
 * ============================================================================
 * 
 * 1. FRONTEND UI PROTECTION
 *    ✓ SharePriceButton: Never displays reportedByUserId
 *    ✓ StationDetails: Never displays reportedByUserId in price history
 *    ✓ Dashboard price views: Never expose field
 *    ✓ All price samples shown to users: filtered to safe fields
 * 
 * 2. ADMIN/DIAGNOSTIC VIEWS
 *    ✓ SystemStatus page: Uses aggregation, never shows raw records
 *    ✓ DataQualityDiagnostics: Shows id, sourceName, fuelType, priceNok, fetchedAt — NOT reportedByUserId
 *    ✓ exportStationDataCSV: Exports Station entity, never touches FuelPrice
 *    ✓ exportMasteringDataJSON: Exports Station/Candidate/Review, never includes FuelPrice
 *    ✓ All admin reads: explicitly filter to safe field lists
 * 
 * 3. BACKEND FUNCTIONS
 *    ✓ All price sample construction: manual field whitelisting
 *    ✓ No raw record returns: diagnostic functions build safe payloads
 *    ✓ Field-level discipline: reportedByUserId never included in response objects
 * 
 * ============================================================================
 * CONSTRAINTS FOR ONGOING DEVELOPMENT (UNTIL API-LEVEL FILTERING ADDED)
 * ============================================================================
 * 
 * DO NOT VIOLATE:
 * 
 * 1. Never create new export/debug functions that return raw FuelPrice records
 *    Example BAD:
 *    const allPrices = await base44.entities.FuelPrice.list();
 *    return Response.json(allPrices); // ← EXPOSES reportedByUserId
 * 
 * 2. Never add "view full price record" endpoints or API responses
 *    Example BAD:
 *    const price = await base44.entities.FuelPrice.get(id);
 *    return Response.json(price); // ← EXPOSES reportedByUserId
 * 
 * 3. Never expose FuelPrice in public/unauthenticated reads
 *    Already protected: FuelPrice reads require auth (Base44 auth layer)
 * 
 * 4. All new price diagnostic/reporting views must:
 *    - Manually construct safe response objects
 *    - Whitelist only: id, sourceName, fuelType, priceNok, stationId, 
 *                     fetchedAt, sourceUpdatedAt, sourceFrequency, 
 *                     confidenceScore, priceType, plausibilityStatus, etc.
 *    - Explicitly exclude: reportedByUserId
 * 
 * 5. Code review gate:
 *    Any FuelPrice data returned to client must be field-audited
 *    Search pattern: "FuelPrice" + "Response.json" → check field whitelist
 * 
 * ============================================================================
 * FUTURE HARDENING (NOT MVP)
 * ============================================================================
 * 
 * When MVP stabilizes and analytics/admin features mature, implement:
 * 
 * OPTION A: API-Level Field Filtering
 *   - Add field mask support to Base44 SDK
 *   - Define safe FuelPrice projection for reads
 *   - Enforce at SDK layer: reportedByUserId never returned
 *   Benefit: Removes manual discipline requirement
 *   Cost: Base44 platform change
 * 
 * OPTION B: Backend Safe Projection
 *   - Create helper function: FuelPrice.safeRead(id, fields) 
 *   - All FuelPrice reads go through this projection
 *   - Maintains whitelist at backend
 *   Benefit: Full control, testable
 *   Cost: Requires SDK wrapper layer
 * 
 * OPTION C: Private Immutable Data Store
 *   - Move reportedByUserId to separate, fully private entity
 *   - FuelPrice.auditLog reference (admin-only)
 *   - FuelPrice itself stays fully readable
 *   Benefit: Clean separation
 *   Cost: Schema migration
 * 
 * ============================================================================
 * RATIONALE: WHY ACCEPT THIS MVP LIMITATION?
 * ============================================================================
 * 
 * 1. UI layer is stable and under dev control
 *    → Risk of public exposure is LOW (requires UI bug + feature interaction)
 * 
 * 2. reportedByUserId is non-sensitive by itself
 *    → Is a UUID/hash, not email or personal data
 *    → Used only for contribution tracking and future gamification
 *    → Not exposed in any social sharing or public endpoint
 * 
 * 3. Crowdsourcing features still in design phase
 *    → Hard to know API-level filtering requirements until after MVP
 *    → Adding filtering now may constrain future design
 * 
 * 4. Base44 SDK limitations
 *    → No field mask support yet
 *    → Backend filtering would require SDK wrapper (overhead)
 * 
 * ============================================================================
 * MONITORING & ESCALATION
 * ============================================================================
 * 
 * If any of these occur, escalate to API-level filtering immediately:
 * 
 * 1. Public endpoint accidentally returns FuelPrice with reportedByUserId
 * 2. User-facing feature requests "user activity" or "who reported this"
 * 3. New crowdsourcing/gamification rules require identity logic
 * 4. Social sharing or public API is added
 * 5. Third-party integrations request FuelPrice data export
 * 
 * ============================================================================
 * AUDIT CHECKLIST FOR CODE REVIEW
 * ============================================================================
 * 
 * When reviewing changes that touch FuelPrice:
 * 
 * □ Does the change return FuelPrice data to frontend/client? 
 *   If YES → verify reportedByUserId is NOT in response
 * 
 * □ Is this a new export, debug, or reporting view?
 *   If YES → check field whitelisting is explicit
 * 
 * □ Does this create an admin or diagnostic endpoint?
 *   If YES → verify it doesn't expose reportedByUserId
 * 
 * □ Are we adding a new public API endpoint?
 *   If YES → FuelPrice must NOT be included without explicit approval
 * 
 * □ Does this touch user identity or attribution logic?
 *   If YES → ensure reportedByUserId remains internal only
 * 
 * ============================================================================
 */

// This is a governance file, not executable code.
// Last reviewed: 2026-03-09
// Next review: After crowdsourcing features enter design phase