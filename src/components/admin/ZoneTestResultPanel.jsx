/**
 * Displays 3 clearly separated test result sections for a zone test:
 * 1. LIVE GP RESULT — what GP API returned now
 * 2. STORED DB RESULT — what was in DB before this test
 * 3. PERSISTENCE RESULT — what new rows were created this test
 */
export default function ZoneTestResultPanel({ testResult }) {
  if (!testResult) return null;

  return (
    <div className="space-y-2 rounded border p-2.5 bg-gradient-to-b from-slate-50 to-white">
      <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 pb-1 border-b">Test Result Breakdown</div>
      
      {/* 1. LIVE GP RESULT */}
      <div className="space-y-1 text-xs">
        <div className="font-semibold text-blue-800">① LIVE GP RESULT</div>
        <div className="text-blue-700 pl-2 space-y-0.5">
          <div>GP reachable: <strong>{testResult.apiResults.apiErrors > 0 ? '❌ No' : '✓ Yes'}</strong></div>
          <div>Places found: <strong>{testResult.apiResults.totalPlaces}</strong></div>
          {testResult.apiResults.observedFuelTypes?.length > 0 && (
            <div>Fuel types: <strong>{testResult.apiResults.observedFuelTypes.join(', ')}</strong></div>
          )}
          {testResult.apiResults.latestSourceUpdatedAt && (
            <div className="text-xs text-blue-600">Latest source update: {new Date(testResult.apiResults.latestSourceUpdatedAt).toLocaleString('nb-NO')}</div>
          )}
        </div>
      </div>

      {/* 2. STORED DB RESULT */}
      <div className="space-y-1 text-xs border-t pt-1">
        <div className="font-semibold text-green-800">② STORED DB RESULT (Before this test)</div>
        <div className="text-green-700 pl-2 space-y-0.5">
          <div>GP prices in DB: <strong>{testResult.coverage.coveredCount > 0 ? `✓ Yes (${testResult.coverage.coveredCount} stn)` : '—'}</strong></div>
          {testResult.coverage.storedFuelTypes?.length > 0 && (
            <div>Stored types: <strong>{testResult.coverage.storedFuelTypes.join(', ')}</strong></div>
          )}
          {testResult.coverage.lastStoredFetchedAt && (
            <div className="text-xs text-green-600">Last fetchedAt: {new Date(testResult.coverage.lastStoredFetchedAt).toLocaleString('nb-NO')}</div>
          )}
        </div>
      </div>

      {/* 3. PERSISTENCE RESULT */}
      <div className={`space-y-1 text-xs border-t pt-1 ${testResult.coverage.newRowsCreatedThisTest > 0 ? 'bg-orange-50 -m-2 p-2 rounded' : ''}`}>
        <div className={`font-semibold ${testResult.coverage.newRowsCreatedThisTest > 0 ? 'text-orange-800' : 'text-slate-700'}`}>③ PERSISTENCE RESULT (This test)</div>
        <div className={`pl-2 space-y-0.5 ${testResult.coverage.newRowsCreatedThisTest > 0 ? 'text-orange-700' : 'text-slate-600'}`}>
          <div>New FuelPrice rows created: <strong>{testResult.coverage.newRowsCreatedThisTest > 0 ? `✓ Yes (${testResult.coverage.newRowsCreatedThisTest})` : '✗ No'}</strong></div>
          {testResult.coverage.newRowsCreatedThisTest === 0 && (
            <div className="italic text-slate-500 mt-1 text-xs">
              {testResult.apiResults.totalPlaces === 0 
                ? 'GP returned no results — nothing to persist.'
                : testResult.coverage.coveredCount > 0
                ? 'GP returned results but no new rows (may be duplicates).'
                : 'GP returned results but no price data was persisted.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}