import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info } from "lucide-react";
import DuplicateStationGroup from "./DuplicateStationGroup";

export default function DuplicateDetectionResults({ results }) {
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
      ) : (
        <div>
          {/* Exact Coordinate Duplicates */}
          {duplicate_groups.filter(g => g.classification === 'exact_coordinate_duplicate').length > 0 && (
            <div className="mb-6">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-red-600 text-lg leading-none">●</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Exact Coordinate Duplicates ({duplicate_groups.filter(g => g.classification === 'exact_coordinate_duplicate').length})
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Multiple Station records at identical GPS coordinates. Highest confidence duplicates — likely same physical location entered multiple times.
                  </p>
                </div>
              </div>
              {duplicate_groups.filter(g => g.classification === 'exact_coordinate_duplicate').map((group, idx) => (
                <DuplicateStationGroup key={`exact-${idx}`} group={group} index={idx} />
              ))}
            </div>
          )}

          {/* Same Location, Different Names/Chains */}
          {duplicate_groups.filter(g => g.classification === 'exact_name_chain_duplicate').length > 0 && (
            <div className="mb-6">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-orange-600 text-lg leading-none">●</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Same Location, Different Names/Chains ({duplicate_groups.filter(g => g.classification === 'exact_name_chain_duplicate').length})
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Station records at identical coordinates but with different names or chain assignments. May indicate brand rebranding or data entry variations.
                  </p>
                </div>
              </div>
              {duplicate_groups.filter(g => g.classification === 'exact_name_chain_duplicate').map((group, idx) => (
                <DuplicateStationGroup key={`coord-${idx}`} group={group} index={idx} />
              ))}
            </div>
          )}

          {/* Possible Near-Duplicates */}
          {duplicate_groups.filter(g => g.classification === 'possible_near_duplicate').length > 0 && (
            <div className="mb-6">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-yellow-600 text-lg leading-none">●</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Possible Near-Duplicates ({duplicate_groups.filter(g => g.classification === 'possible_near_duplicate').length})
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Stations within ~50m proximity with similar or same names/chains. May be legitimate separate locations or duplicates — curator judgment required.
                  </p>
                </div>
              </div>
              {duplicate_groups.filter(g => g.classification === 'possible_near_duplicate').map((group, idx) => (
                <DuplicateStationGroup key={`near-${idx}`} group={group} index={idx} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}