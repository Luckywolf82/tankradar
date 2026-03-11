/*
IDEA: receipt-import

Samtykkebasert lesing av drivstoffkjøp
Allow users to optionally import fuel prices from email receipts or photos
*/

export const receiptImport = {
  id: "receipt-import",
  title: "Samtykkebasert lesing av drivstoffkjøp",
  category: "crowdsourcing",
  status: "candidate",

  summary:
    "Allow users to optionally import fuel prices from email receipts (via Gmail) or receipt photos (OCR) for automatic price logging",

  problem:
    "Manual price entry is friction and reduces crowdsourcing participation. Automated import from receipts could dramatically increase data quality and user contribution frequency.",

  userValue: "medium",
  crowdsourcingImpact: "direct",
  activationImpact: "high",

  complexity: "medium",
  dependencies: [
    "ocr-or-receipt-parser-service",
    "user-email-oauth-gmail",
    "receipt-validation-engine",
    "image-upload-infrastructure",
    "user-consent-tracking",
  ],

  recommendedAuditTypes: [
    "product",
    "activation",
    "security",
    "publishability",
    "data",
  ],

  notes: `
⚠️ PRIVACY-CRITICAL: This feature touches:
- User email access
- Personal purchase history
- Image storage

Constraints:
- Explicit user consent for each import
- No persistent email storage
- No long-term image retention
- Clear opt-out mechanism
- Audit trail of imports

Two approaches:

1. Email Integration (Gmail OAuth):
   - User grants app read access to inbox
   - App searches for receipt emails
   - Parses structured data from email
   - Deletes email search cache after processing
   - Pros: automatic, reduces friction
   - Cons: email access is sensitive, trust barrier

2. Photo Upload (Manual):
   - User takes photo of receipt
   - OCR extracts: station, fuel type, price, timestamp
   - User confirms extracted data
   - Image deleted after confirmation
   - Pros: less invasive, user-controlled
   - Cons: requires more steps, OCR accuracy matters

Recommend MVP:
- Photo upload first (lower privacy barrier)
- Email integration as Phase 2 (if adoption justifies trust)

OCR considerations:
- Must handle Norwegian text
- Precision on prices > 95%
- Timestamp extraction important
- Station name matching critical
`,

  possibleFeatures: [
    "Gmail OAuth: auto-import from receipt emails",
    "Photo capture: on-device OCR or cloud processing",
    "Manual review: user confirms extracted values",
    "Bulk import: multiple receipts at once",
    "Receipt history: user can see their own imports",
    "Fraud detection: flag suspiciously low/high prices",
  ],

  successMetrics: [
    "% of users who enable receipt import",
    "Avg receipts imported per active user per month",
    "Data quality: OCR accuracy vs. manual entry",
    "User trust: uninstall rate (receipt-related feedback)",
  ],
};

export default receiptImport;