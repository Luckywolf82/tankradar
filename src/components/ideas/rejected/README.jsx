/*
REJECTED IDEAS

Archive of product ideas that were evaluated but not approved for build.

Kept for traceability to:
1. Avoid re-debating the same proposals repeatedly
2. Provide historical context for decisions
3. Enable revisiting if market conditions change
4. Document reasoning behind "no" decisions

Move ideas here when:
- Audit recommends against implementation
- Business priorities change
- Technical constraints make unfeasible
- User research shows low value

All rejected ideas maintain their original structure and audit findings.
*/

export const REJECTED_IDEAS_POLICY = {
  purpose: "Traceability and historical record",
  
  when_to_move_here: [
    "Audit completed and recommends against implementation",
    "Business stakeholder decision: deprioritize",
    "Technical evaluation: too costly / complex",
    "User research: insufficient demand",
    "Dependency changed: no longer viable",
  ],

  how_to_preserve_context: [
    "Keep original idea file with all fields",
    "Add rejection_reason field",
    "Add rejection_audit reference (if applicable)",
    "Add rejection_date",
    "Add notes on how this might be revisited",
  ],

  example: {
    id: "example-rejected-idea",
    title: "Some idea that didn't work out",
    status: "rejected",
    rejection_reason: "Audit showed insufficient user value relative to complexity",
    rejection_audit: "product-audit-2026-03-15.jsx",
    rejection_date: "2026-03-15",
    revisit_conditions: "If user base grows 2x, reconsider value/effort ratio",
  },

  current_rejected_count: 0,
};

export default REJECTED_IDEAS_POLICY;