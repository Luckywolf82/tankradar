import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info, ChevronDown } from "lucide-react";
import DuplicateStationGroup from "./DuplicateStationGroup";

export default function DuplicateDetectionResults({ results }) {
  const [showWhyGrouped, setShowWhyGrouped] = useState(false);
  const [selectedClassifications, setSelectedClassifications] = useState({
    exact_coordinate_duplicate: true,
    exact_name_chain_duplicate: true,
    possible_near_duplicate: true,
  });
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("confidence");

  if (!results || results.status === 'no_stations_found') {
    return (
      <Card className="bg-blue-50 border border-blue-200">
        <CardContent className="pt-6 text-center">
          <Info size={20} className="mx-auto text-blue-600 mb-2" />
          <p className="text-slate-700">No stations found for this city.</p>
        </CardContent>
      </Card>
    );
  }

  const { summary, duplicate_groups, city } = results;
  const hasNoDuplicates = !duplicate_groups || duplicate_groups.length === 0;

  // Apply filters and sorting
  let filtered = duplicate_groups.filter(g => {
    const classMatch = selectedClassifications[g.classification];
    const confMatch = confidenceFilter === "all" || g.confidence === confidenceFilter;
    return classMatch && confMatch;
  });

  filtered.sort((a, b) => {
    if (sortBy === "confidence") {
      const confOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (confOrder[a.confidence] || 999) - (confOrder[b.confidence] || 999);
    } else if (sortBy === "size") {
      return b.stations.length - a.stations.length;
    } else if (sortBy === "distance") {
      return (a.distance_meters || 0) - (b.distance_meters || 0);
    }
    return 0;
  });

  return (
    <div>
      {/* Preview banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
        <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <strong>Preview only.</strong> This scan identifies potential duplicate Station records based on GPS proximity and name/chain matching. 
          No records will be merged, deleted, or modified automatically.
          <div className="mt-1 text-xs text-amber-800">
            Manual curator review and explicit governance approval required before any consolidation actions.
          </div>
        </div>
      </div>

      {/* Why Grouped Explanation */}
      <div className="mb-4">
        <button
          onClick={() => setShowWhyGrouped(!showWhyGrouped)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700 mb-2"
        >
          <ChevronDown size={16} className={`transition-transform ${showWhyGrouped ? 'rotate-180' : ''}`} />
          Why we grouped these duplicates
        </button>
        {showWhyGrouped && (
          <Card className="bg-slate-50 border border-slate-200 mb-3">
            <CardContent className="pt-4 space-y-3 text-sm text-slate-700">
              <div>
                <p className="font-medium text-slate-900 mb-1">🔴 Exact Coordinate Duplicates</p>
                <p className="text-xs">Station records at identical GPS coordinates. Likely same physical location entered multiple times (data entry error, import merge, or duplicate sources).</p>
              </div>
              <div>
                <p className="font-medium text-slate-900 mb-1">🟠 Same Location, Different Names/Chains</p>
                <p className="text-xs">Station records at identical coordinates but with different names or chain assignments. May indicate brand rebranding, operator changes, or data discrepancies from different sources.</p>
              </div>
              <div>
                <p className="font-medium text-slate-900 mb-1">🟡 Possible Near-Duplicates</p>
                <p className="text-xs">Stations within ~50m proximity with similar or same names/chains. May be legitimate separate locations (pumps, branches) or duplicates—curator judgment required.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Controls */}
      <Card className="mb-4 bg-slate-50 border border-slate-200">
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-900 mb-2">Filter by Classification</p>
              <div className="flex flex-wrap gap-3">
                {['exact_coordinate_duplicate', 'exact_name_chain_duplicate', 'possible_near_duplicate'].map(cls => (
                  <label key={cls} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedClassifications[cls]}
                      onChange={() => setSelectedClassifications(p => ({ ...p, [cls]: !p[cls] }))}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-700">
                      {cls === 'exact_coordinate_duplicate' && '🔴 Exact Coordinate'}
                      {cls === 'exact_name_chain_duplicate' && '🟠 Same Location'}
                      {cls === 'possible_near_duplicate' && '🟡 Near-Duplicate'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-900 block mb-1">
                  Confidence Filter
                </label>
                <select
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value)}
                  className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Confidence Levels</option>
                  <option value="HIGH">🔴 HIGH only</option>
                  <option value="MEDIUM">🟡 MEDIUM only</option>
                  <option value="LOW">🔵 LOW only</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-900 block mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="confidence">Confidence</option>
                  <option value="size">Group Size</option>
                  <option value="distance">Distance</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scan Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-1">Scan of <strong>{city}</strong></p>
            <p className="text-sm text-slate-700">
              Found <strong>{summary.total_stations}</strong> stations total.
              {summary.exact_coordinate_duplicates + summary.exact_name_chain_duplicates + summary.possible_near_duplicates === 0 
                ? " No duplicates detected." 
                : ` Identified ${summary.exact_coordinate_duplicates + summary.exact_name_chain_duplicates + summary.possible_near_duplicates} potential duplicate cluster(s).`}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t pt-3">
            <div>
              <p className="text-xs text-slate-600 font-medium">Exact Coordinate</p>
              <p className="text-lg font-bold text-red-600">{summary.exact_coordinate_duplicates}</p>
              <p className="text-xs text-slate-500 mt-0.5">Same GPS (identical)</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Same Location</p>
              <p className="text-lg font-bold text-orange-600">{summary.exact_name_chain_duplicates}</p>
              <p className="text-xs text-slate-500 mt-0.5">Different names/chains</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Near-Duplicate</p>
              <p className="text-lg font-bold text-yellow-600">{summary.possible_near_duplicates}</p>
              <p className="text-xs text-slate-500 mt-0.5">Close proximity (&lt;50m)</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Total Clusters</p>
              <p className="text-lg font-bold text-slate-900">{summary.exact_coordinate_duplicates + summary.exact_name_chain_duplicates + summary.possible_near_duplicates}</p>
              <p className="text-xs text-slate-500 mt-0.5">Requires review</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results by classification */}
      {hasNoDuplicates ? (
        <Card className="bg-green-50 border border-green-200">
          <CardContent className="pt-6 text-center">
            <Info size={20} className="mx-auto text-green-600 mb-2" />
            <p className="text-slate-700 font-medium">No duplicates detected</p>
            <p className="text-sm text-slate-600">Catalog appears clean for {city}.</p>
          </CardContent>
        </Card>
      ) : hasNoDuplicates ? (
        <Card className="bg-green-50 border border-green-200">
          <CardContent className="pt-6 text-center">
            <Info size={20} className="mx-auto text-green-600 mb-2" />
            <p className="text-slate-700 font-medium">No duplicates detected</p>
            <p className="text-sm text-slate-600">Catalog appears clean for {city}.</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="bg-blue-50 border border-blue-200">
          <CardContent className="pt-6 text-center">
            <Info size={20} className="mx-auto text-blue-600 mb-2" />
            <p className="text-slate-700">No duplicates match current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filtered.map((group, idx) => (
            <DuplicateStationGroup key={`${group.classification}-${idx}`} group={group} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}