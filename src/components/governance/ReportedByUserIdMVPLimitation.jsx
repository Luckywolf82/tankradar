/**
 * GOVERNANCE DOCUMENTATION: reportedByUserId MVP LIMITATION
 * 
 * This file documents an accepted MVP technical debt constraint.
 * For full details, see the inline documentation below.
 * 
 * ============================================================================
 * SUMMARY
 * ============================================================================
 * 
 * Field:        reportedByUserId (FuelPrice entity)
 * Status:       Accepted MVP limitation pending API-level hardening
 * Risk Level:   LOW (UI/read-path discipline currently sufficient)
 * 
 * Current protection: UI-layer field whitelisting + backend read-path discipline
 * Future fix:        API-level field filtering or safe backend projection
 * 
 * ============================================================================
 * THE ISSUE
 * ============================================================================
 * 
 * The FuelPrice entity includes `reportedByUserId` to track which authenticated
 * user contributed user_reported price observations.
 * 
 * Base44 SDK returns FULL entity records including reportedByUserId:
 * - ✓ Protected: Never exposed in public/unauthenticated paths
 * - ✓ Protected: UI layer filters all displayed records
 * - ✓ Protected: Admin/diagnostic reads use field whitelisting
 * - ⚠ Unprotected: API returns complete record if requested
 * 
 * MVP approach: Accept this as technical debt. UI discipline is sufficient.
 * 
 * ============================================================================
 * CURRENT SAFEGUARDS (UI & READ-PATH DISCIPLINE)
 * ============================================================================
 * 
 * FRONTEND UI (verified safe):
 * ✓ SharePriceButton: Never displays reportedByUserId
 * ✓ StationDetails: Never includes field in price history
 * ✓ Dashboard price views: All samples filtered to safe fields
 * ✓ User-facing price lists: Whitelist: id, fuelType, priceNok, 
 *                             fetchedAt, sourceName, plausibilityStatus
 * 
 * ADMIN/DIAGNOSTIC VIEWS (verified safe):
 * ✓ SystemStatus: Aggregation only, never raw records
 * ✓ DataQualityDiagnostics: Shows id, sourceName, fuelType, priceNok, fetchedAt
 * ✓ exportStationDataCSV: Station entity only, never touches FuelPrice
 * ✓ exportMasteringDataJSON: Station/Candidate/Review only, no FuelPrice
 * ✓ All admin reads: Explicit field whitelisting in responses
 * 
 * BACKEND (verified safe):
 * ✓ All price samples: Manual field whitelisting
 * ✓ No raw returns: Diagnostic functions build safe payloads
 * ✓ Discipline enforced: reportedByUserId never in response objects
 * 
 * ============================================================================
 * CONSTRAINTS FOR ONGOING DEVELOPMENT
 * ============================================================================
 * 
 * RULES (until API-level filtering is added):
 * 
 * 1. Never create export/debug functions returning raw FuelPrice records
 *    BAD: const prices = await base44.entities.FuelPrice.list();
 *         return Response.json(prices);  // ← Exposes reportedByUserId
 * 
 * 2. Never add "view full price record" endpoints
 *    BAD: const price = await base44.entities.FuelPrice.get(id);
 *         return Response.json(price);  // ← Exposes reportedByUserId
 * 
 * 3. All new price reads must manually whitelist safe fields
 *    GOOD: const prices = await base44.entities.FuelPrice.filter({...});
 *          return Response.json(prices.map(p => ({
 *            id: p.id,
 *            fuelType: p.fuelType,
 *            priceNok: p.priceNok,
 *            fetchedAt: p.fetchedAt,
 *            sourceName: p.sourceName
 *            // Notably: NO reportedByUserId
 *          })));
 * 
 * 4. Code review gate: FuelPrice returns must be field-audited
 *    Pattern: Search "FuelPrice" + "Response.json" → verify whitelist
 * 
 * ============================================================================
 * FUTURE HARDENING (POST-MVP)
 * ============================================================================
 * 
 * When MVP stabilizes, implement ONE of:
 * 
 * OPTION A: API-Level Field Filtering (Base44 platform change)
 *   - Add field mask to SDK
 *   - Enforce reportedByUserId never returned
 *   - Benefit: Removes discipline requirement
 *   - Cost: Requires platform change
 * 
 * OPTION B: Backend Safe Projection
 *   - Wrapper: FuelPrice.safeRead(fields)
 *   - Whitelist maintained at backend
 *   - Benefit: Full control, testable
 *   - Cost: SDK wrapper overhead
 * 
 * OPTION C: Separate Private Audit Log
 *   - Move reportedByUserId to private entity
 *   - FuelPrice stays fully readable
 *   - FuelPrice.auditLog reference (admin-only)
 *   - Benefit: Clean separation of concerns
 *   - Cost: Schema migration
 * 
 * ============================================================================
 * ESCALATION TRIGGERS (Implement filtering immediately if):
 * ============================================================================
 * 
 * □ Public endpoint accidentally returns FuelPrice.reportedByUserId
 * □ User-facing feature requests "user activity" or "who reported this"
 * □ New crowdsourcing/gamification rules require identity features
 * □ Social sharing or public API is planned
 * □ Third-party integrations request FuelPrice export
 * 
 * ============================================================================
 */

export const GOVERNANCE_META = {
  topic: 'reportedByUserId MVP Limitation',
  status: 'Accepted technical debt',
  riskLevel: 'LOW (UI discipline sufficient for MVP)',
  reviewDate: '2026-03-09',
  nextReviewTrigger: 'After crowdsourcing feature design phase'
};