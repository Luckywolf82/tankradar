/**
 * Displays 3 clearly separated test result sections for a station test:
 * 1. LIVE GP RESULT — what GP API returned now
 * 2. STORED DB RESULT — what was in DB before this test
 * 3. PERSISTENCE RESULT — what new rows were created this test
 */
export default function StationTestResultPanel({ live }) {
  if (!live) return null;

  return (
    <div className="space-y-2">
      {/* 1. LIVE GP RESULT */}
      <div className="rounded-lg border p-2.5 bg-blue-50 border-blue-200">
        <div className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">① LIVE GP RESULT</div>
        <div className="space-y-1 text-xs text-blue-700">
          <div className="flex justify-between">
            <span>GP reachable</span>
            <span className="font-semibold">{live.gpReachable ? '✓ Yes' : '❌ No'}</span>
          </div>
          <div className="flex justify-between">
            <span>Match found</span>
            <span className="font-semibold">{live.gpMatchFound ? '✓ Yes' : '✗ No'}</span>
          </div>
          <div className="flex justify-between">
            <span>Results returned</span>
            <span className="font-semibold">{live.resultsCount}</span>
          </div>
          {live.gpMatchFound && (
            <>
              <div className="flex justify-between">
                <span>Match distance</span>
                <span className="font-semibold">{live.matchDistance != null ? `${live.matchDistance} km` : '—'}</span>
              </div>
              {live.liveFuelTypes?.length > 0 && (
                <div className="flex justify-between">
                  <span>Live fuel types</span>
                  <span className="font-semibold">{live.liveFuelTypes.join(', ')}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. STORED DB RESULT (shown for all tests) */}
      <div className="rounded-lg border p-2.5 bg-green-50 border-green-200">
        <div className="text-xs font-bold text-green-800 uppercase tracking-wide mb-2">② STORED DB RESULT (Before this test)</div>
        <div className="space-y-1 text-xs text-green-700">
          <div className="text-slate-600 italic">Check section "A · Stored data" above for DB coverage</div>
        </div>
      </div>

      {/* 3. PERSISTENCE RESULT */}
      <div className={`rounded-lg border p-2.5 ${live.newRowsCreated > 0 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${live.newRowsCreated > 0 ? 'text-orange-800' : 'text-slate-700'}`}>③ PERSISTENCE RESULT (This test)</div>
        <div className={`space-y-1 text-xs ${live.newRowsCreated > 0 ? 'text-orange-700' : 'text-slate-600'}`}>
          <div className="flex justify-between">
            <span>New FuelPrice rows created</span>
            <span className="font-semibold">{live.newRowsCreated > 0 ? `✓ Yes (${live.newRowsCreated})` : '✗ No'}</span>
          </div>
          {live.newRowsCreated === 0 && (
            <div className="italic text-slate-500 mt-1">
              {!live.gpReachable
                ? 'GP not reachable — nothing to persist.'
                : live.resultsCount === 0
                ? 'No GP results returned — nothing to persist.'
                : !live.gpMatchFound
                ? 'No match found in results — nothing to persist.'
                : 'GP matched but no price data was persisted.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}