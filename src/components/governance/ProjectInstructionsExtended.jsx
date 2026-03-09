/**
 * PROJECT INSTRUCTIONS – EXTENDED GOVERNANCE
 * v1.0 (2026-03-09)
 * 
 * Four critical patches to core principles:
 * 1. New review types require explicit governance update
 * 2. reportedByUserId set when available; else null
 * 3. Preview-before-apply for large-impact changes
 * 4. Consistent file naming (.js)
 */

export const ProjectInstructionsExtended = () => {
  return (
    <div className="prose max-w-4xl space-y-8">
      <h1>Extended Governance – Four Critical Patches</h1>
      <p className="text-sm text-gray-600">v1.0 | 2026-03-09 | Locked for production</p>

      {/* PATCH 1 */}
      <section className="border-l-4 border-red-500 pl-6">
        <h2>Patch 1: New Review Types Require Explicit Governance Update</h2>
        
        <div className="bg-red-50 p-4 rounded mt-4 mb-4">
          <p className="font-bold text-red-900">RULE: No new review_type shall be introduced without governance update.</p>
        </div>

        <h3>StationReview Usage</h3>
        <p><strong>USED FOR:</strong></p>
        <ul>
          <li>Station-mastering (name, chain, duplicate resolution)</li>
          <li>Classification inconsistencies (within existing governance types)</li>
          <li>Manual clarifications</li>
        </ul>

        <p><strong>NOT USED FOR:</strong></p>
        <ul>
          <li>General tasks</li>
          <li>Price data problems (use FetchLog)</li>
          <li>New workflow types without governance definition</li>
        </ul>

        <h3>Mandatory Process for New review_type</h3>
        <ol>
          <li>Define governance rules for the type</li>
          <li>Update PROJECT_INSTRUCTIONS_Extended.jsx</li>
          <li>Update entity schema (StationReview.review_type enum)</li>
          <li>Implement logic</li>
          <li>Test with representative dataset</li>
          <li>Document results</li>
        </ol>

        <p className="text-sm text-gray-600 mt-4"><strong>Status:</strong> This is not open to interpretation. No exceptions.</p>
      </section>

      {/* PATCH 2 */}
      <section className="border-l-4 border-blue-500 pl-6">
        <h2>Patch 2: reportedByUserId Set When Available</h2>
        
        <div className="bg-blue-50 p-4 rounded mt-4 mb-4">
          <p className="font-bold text-blue-900">RULE: FuelPrice.reportedByUserId is set when price reported by logged-in user; else null.</p>
        </div>

        <h3>Data Integrity</h3>
        <ul>
          <li>Set when: User is authenticated AND reports a price</li>
          <li>Set to: User's internal ID</li>
          <li>Set to null: When no authenticated user or not a user report</li>
        </ul>

        <h3>Visibility & Usage</h3>
        <ul>
          <li><strong>NEVER</strong> exposed publicly in MVP</li>
          <li>Enables future gamification (contribution tracking)</li>
          <li>Enables audit trail for user-reported data</li>
        </ul>

        <p className="text-sm text-gray-600 mt-4"><strong>Rationale:</strong> More robust than "only set for logged-in users" — explicitly states null state.</p>
      </section>

      {/* PATCH 3 */}
      <section className="border-l-4 border-green-500 pl-6">
        <h2>Patch 3: Preview-Before-Apply for Large-Impact Changes</h2>
        
        <div className="bg-green-50 p-4 rounded mt-4 mb-4">
          <p className="font-bold text-green-900">RULE: Changes affecting many records or critical pipelines must be previewed before apply.</p>
        </div>

        <h3>When This Applies</h3>
        <ul>
          <li>Bulk classification changes</li>
          <li>Matching algorithm adjustments</li>
          <li>Data migrations</li>
          <li>Parser configuration updates</li>
          <li>Source registry changes affecting multiple stations</li>
        </ul>

        <h3>Mandatory Process</h3>
        <ol>
          <li>Generate preview of affected records</li>
          <li>Show examples of what will change</li>
          <li>Display metrics: count affected, before/after comparison</li>
          <li>Request explicit approval from user</li>
          <li>Only then execute apply</li>
        </ol>

        <p className="text-sm text-gray-600 mt-4"><strong>Status:</strong> This is a cross-cutting governance principle — applies to all major data operations.</p>
      </section>

      {/* PATCH 4 */}
      <section className="border-l-4 border-purple-500 pl-6">
        <h2>Patch 4: Consistent File Naming (.js Extension)</h2>
        
        <div className="bg-purple-50 p-4 rounded mt-4 mb-4">
          <p className="font-bold text-purple-900">RULE: All frozen files and truth-source references use .js extension.</p>
        </div>

        <h3>Frozen Files (Do Not Edit)</h3>
        <ul>
          <li>functions/classifyStationsRuleEngine.js</li>
          <li>functions/classifyGooglePlacesConfidence.js</li>
          <li>functions/classifyPricePlausibility.js</li>
          <li>functions/deleteAllGooglePlacesPrices.js</li>
          <li>functions/deleteGooglePlacesPricesForReclassification.js</li>
          <li>functions/verifyGooglePlacesPriceNormalization.js</li>
        </ul>

        <h3>Documentation Files (Reference Only)</h3>
        <ul>
          <li>functions/BACKEND_ARCHITECTURE_NOTES (governance)</li>
          <li>functions/PROJECT_INSTRUCTIONS_v1 (extended governance)</li>
        </ul>

        <p className="text-sm text-gray-600 mt-4"><strong>Rationale:</strong> Prevents confusion. Clear file extension = clear intent.</p>
      </section>

      {/* SUMMARY */}
      <section className="bg-gray-100 p-6 rounded-lg">
        <h2>Summary Table</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Patch</th>
              <th className="text-left py-2">Key Rule</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">1</td>
              <td>New review types require governance update</td>
              <td className="font-bold text-red-600">LOCKED</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">2</td>
              <td>reportedByUserId set when available</td>
              <td className="font-bold text-blue-600">LOCKED</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">3</td>
              <td>Preview-before-apply for large changes</td>
              <td className="font-bold text-green-600">LOCKED</td>
            </tr>
            <tr>
              <td className="py-2">4</td>
              <td>Consistent .js file naming</td>
              <td className="font-bold text-purple-600">LOCKED</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Version History</h2>
        <ul>
          <li><strong>v1.0 (2026-03-09)</strong> — Initial Extended Governance with four patches</li>
        </ul>
      </section>
    </div>
  );
};

export default ProjectInstructionsExtended;