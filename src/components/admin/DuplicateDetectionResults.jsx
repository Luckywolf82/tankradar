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
          <strong>Preview only.</strong> No records will be merged, deleted, or modified. 
          Manual curator review required for any cleanup decisions.
        </div>
      </div>

      {/* Summary */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scan Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-slate-500">Total Stations</p>
              <p className="text-xl font-bold text-slate-900">{summary.total_stations}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Exact Duplicates</p>
              <p className="text-xl font-bold text-red-600">{summary.exact_duplicates}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Coordinate Duplicates</p>
              <p className="text-xl font-bold text-orange-600">{summary.coordinate_duplicates}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Possible Near-Dupes</p>
              <p className="text-xl font-bold text-yellow-600">{summary.possible_near_duplicates}</p>
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
          {/* Exact Duplicates */}
          {duplicate_groups.filter(g => g.classification === 'EXACT_DUPLICATE').length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-red-600">●</span>
                Exact Coordinate + Name Duplicates ({duplicate_groups.filter(g => g.classification === 'EXACT_DUPLICATE').length})
              </h3>
              {duplicate_groups.filter(g => g.classification === 'EXACT_DUPLICATE').map((group, idx) => (
                <DuplicateStationGroup key={`exact-${idx}`} group={group} index={idx} />
              ))}
            </div>
          )}

          {/* Coordinate Duplicates */}
          {duplicate_groups.filter(g => g.classification === 'COORDINATE_DUPLICATE').length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-orange-600">●</span>
                Same Coordinates, Different Names/Chains ({duplicate_groups.filter(g => g.classification === 'COORDINATE_DUPLICATE').length})
              </h3>
              {duplicate_groups.filter(g => g.classification === 'COORDINATE_DUPLICATE').map((group, idx) => (
                <DuplicateStationGroup key={`coord-${idx}`} group={group} index={idx} />
              ))}
            </div>
          )}

          {/* Possible Near-Duplicates */}
          {duplicate_groups.filter(g => g.classification === 'POSSIBLE_NEAR_DUPLICATE').length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <span className="text-yellow-600">●</span>
                Possible Near-Duplicates ({duplicate_groups.filter(g => g.classification === 'POSSIBLE_NEAR_DUPLICATE').length})
              </h3>
              {duplicate_groups.filter(g => g.classification === 'POSSIBLE_NEAR_DUPLICATE').map((group, idx) => (
                <DuplicateStationGroup key={`near-${idx}`} group={group} index={idx} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}