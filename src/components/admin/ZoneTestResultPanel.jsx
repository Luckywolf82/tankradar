/**
 * Displays 3 clearly separated test result sections for a zone test:
 * 1. LIVE GP RESULT — what GP API returned now
 * 2. STORED DB RESULT — what was in DB before this test
 * 3. PERSISTENCE RESULT — what new rows were created this test
 * PLUS: DECISION SAFETY GUARD — warns if saturation blocks decision use
 */
export default function ZoneTestResultPanel({ testResult }) {
  if (!testResult) return null;

  return (
    <div className="space-y-2">
      <div className="rounded border p-2.5 bg-gradient-to-b from-slate-50 to-white">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 pb-1 border-b">Test Result Breakdown</div>
        
        {/* 1. LIVE GP RESULT */}
        <div className="space-y-1 text-xs mt-2">
          <div className="font-semibold text-blue-800">① LIVE GP RESULT (NOW)</div>
          <div className="text-blue-700 pl-2 space-y-0.5">
            <div>GP reachable: <strong>{testResult.apiResults.apiErrors > 0 ? '❌ No' : '✓ Yes'}</strong></div>
            <div>Places found: <strong>{testResult.apiResults.totalPlaces}</strong></div>
            {testResult.apiResults.observedFuelTypes?.length > 0 && (
              <div>Fuel types: <strong>{testResult.apiResults.observedFuelTypes.join(', ')}</strong></div>
            )}
          </div>
        </div>

        {/* 2. STORED DB RESULT */}
        <div className="space-y-1 text-xs border-t pt-1.5 mt-1.5">
          <div className="font-semibold text-green-800">② STORED DB RESULT (Before test)</div>
          <div className="text-green-700 pl-2 space-y-0.5">
            <div>GP prices in DB: <strong>{testResult.coverage.coveredCount > 0 ? `✓ Yes (${testResult.coverage.coveredCount} stn)` : '—'}</strong></div>
            {testResult.coverage.storedFuelTypes?.length > 0 && (
              <div>Stored types: <strong>{testResult.coverage.storedFuelTypes.join(', ')}</strong></div>
            )}
          </div>
        </div>

        {/* 3. PERSISTENCE RESULT */}
        <div className="space-y-1 text-xs border-t pt-1.5 mt-1.5">
          <div className="font-semibold text-slate-800">③ PERSISTENCE RESULT (This test)</div>
          <div className="text-slate-700 pl-2">
            <div>New FuelPrice rows created: <strong>{testResult.coverage?.newRowsCreatedThisTest > 0 ? `✓ Yes (${testResult.coverage.newRowsCreatedThisTest})` : '✗ No'}</strong></div>
          </div>
        </div>
      </div>

      {/* DECISION SAFETY GUARD */}
      {testResult.decisionSafety && (
        <div className={`rounded border p-2.5 ${testResult.decisionSafety.isDecisionSafe ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${testResult.decisionSafety.isDecisionSafe ? 'text-green-800' : 'text-red-800'}`}>
            {testResult.decisionSafety.isDecisionSafe ? '✓ DECISION SAFE' : '⚠ DECISION BLOCKED'}
          </div>
          <div className={`text-xs space-y-1 ${testResult.decisionSafety.isDecisionSafe ? 'text-green-700' : 'text-red-700'}`}>
            {testResult.decisionSafety.blockedBySaturation && (
              <div className="font-semibold">{testResult.decisionSafety.blockedReason}</div>
            )}
            <div className="text-slate-600 italic">{testResult.decisionSafety.recommendation}</div>
            <div className="text-xs text-slate-500 mt-1">
              Saturation: {testResult.decisionSafety.saturatedFetchPoints}/{testResult.decisionSafety.totalFetchPoints} fetch points (
              {Math.round(testResult.decisionSafety.saturationRate * 100)}%)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}