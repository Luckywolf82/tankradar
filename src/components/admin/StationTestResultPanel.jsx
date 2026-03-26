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
        <div className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">① LIVE GP RESULT (NOW)</div>
        <div className="space-y-1 text-xs text-blue-700">
          <div className="flex justify-between">
            <span>GP reachable now</span>
            <span className="font-semibold">{live.gpReachableNow ? '✓ Yes' : '❌ No'}</span>
          </div>
          <div className="flex justify-between">
            <span>Match found now</span>
            <span className="font-semibold">{live.gpMatchedNow ? '✓ Yes' : '✗ No'}</span>
          </div>
          <div className="flex justify-between">
            <span>Results scanned</span>
            <span className="font-semibold">{live.resultsCount}</span>
          </div>
          {live.gpMatchedNow && (
            <>
              <div className="flex justify-between">
                <span>Live fuel data</span>
                <span className="font-semibold">{live.liveFuelDataFoundNow ? '✓ Yes' : '—'}</span>
              </div>
              {live.liveFuelTypes?.length > 0 && (
                <div className="flex justify-between">
                  <span>Fuel types found</span>
                  <span className="font-semibold text-xs">{live.liveFuelTypes.join(', ')}</span>
                </div>
              )}
              {live.liveSourceUpdatedAt && (
                <div className="text-blue-600 text-xs">
                  Last source update: {new Date(live.liveSourceUpdatedAt).toLocaleString('nb-NO')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. STORED DB RESULT */}
      <div className="rounded-lg border p-2.5 bg-green-50 border-green-200">
        <div className="text-xs font-bold text-green-800 uppercase tracking-wide mb-2">② STORED DB RESULT (Before test)</div>
        <div className="space-y-1 text-xs text-green-700">
          <div className="flex justify-between">
            <span>Stored GP prices</span>
            <span className="font-semibold">{live.storedGpPrices ? '✓ Yes' : '—'}</span>
          </div>
          {live.storedGpPrices && (
            <>
              <div className="flex justify-between">
                <span>Stored fuel types</span>
                <span className="font-semibold text-xs">{live.storedFuelTypes?.length > 0 ? live.storedFuelTypes.join(', ') : 'none'}</span>
              </div>
              {live.lastStoredFetchedAt && (
                <div className="text-green-600 text-xs">
                  Last fetchedAt: {new Date(live.lastStoredFetchedAt).toLocaleString('nb-NO')}
                </div>
              )}
              {live.lastStoredSourceUpdatedAt && (
                <div className="text-green-600 text-xs">
                  Last source update: {new Date(live.lastStoredSourceUpdatedAt).toLocaleString('nb-NO')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3. PERSISTENCE RESULT */}
      <div className={`rounded-lg border p-2.5 ${live.newFuelPriceRowsCreated ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${live.newFuelPriceRowsCreated ? 'text-orange-800' : 'text-slate-700'}`}>③ PERSISTENCE RESULT (This test)</div>
        <div className={`space-y-1 text-xs ${live.newFuelPriceRowsCreated ? 'text-orange-700' : 'text-slate-600'}`}>
          <div className="flex justify-between">
            <span>New rows created</span>
            <span className="font-semibold">{live.newFuelPriceRowsCreated ? `✓ Yes (${live.rowsCreatedCount})` : '✗ No'}</span>
          </div>
          {live.reasonIfNoRowsCreated && (
            <div className="italic text-slate-500 mt-1">{live.reasonIfNoRowsCreated}</div>
          )}
        </div>
      </div>
    </div>
  );
}