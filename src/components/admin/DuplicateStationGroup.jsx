import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, ChevronDown } from "lucide-react";

const classificationStyles = {
  exact_coordinate_duplicate: {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800",
    icon: "text-red-600",
    label: "Exact Coordinate Duplicate",
  },
  exact_name_chain_duplicate: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-800",
    icon: "text-orange-600",
    label: "Same Location, Different Names/Chains",
  },
  possible_near_duplicate: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800",
    icon: "text-yellow-600",
    label: "Possible Near-Duplicate",
  },
};

export default function DuplicateStationGroup({ group, index }) {
  const styles = classificationStyles[group.classification] || classificationStyles.exact_coordinate_duplicate;
  const confidenceBg = {
    HIGH: "bg-red-100 text-red-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    LOW: "bg-blue-100 text-blue-800",
  }[group.confidence] || "bg-slate-100 text-slate-800";
  const [expanded, setExpanded] = useState(false);

  // Compute difference summary
  const computeDifferenceSummary = () => {
    const uniqueNames = [...new Set(group.stations.map(s => s.name))];
    const uniqueChains = [...new Set(group.stations.map(s => s.chain || 'unknown').filter(c => c !== 'unknown'))];
    const uniqueAddresses = [...new Set(group.stations.map(s => s.address).filter(Boolean))];

    // Coordinate spread
    let coordSpreadNote = "All records at identical GPS coordinates";
    if (group.distance_meters > 0) {
      if (group.distance_meters <= 10) {
        coordSpreadNote = `Records within ${group.distance_meters}m (very close proximity)`;
      } else if (group.distance_meters <= 50) {
        coordSpreadNote = `Records within ${group.distance_meters}m (nearby vicinity)`;
      } else {
        coordSpreadNote = `Records span ${group.distance_meters}m distance`;
      }
    }

    // Build observations
    const observations = [];
    if (uniqueNames.length === 1) {
      observations.push("Same station name across all records");
    } else {
      observations.push(`${uniqueNames.length} different station names`);
    }

    if (uniqueChains.length === 0) {
      observations.push("No chain information available");
    } else if (uniqueChains.length === 1) {
      observations.push(`Consistent chain: ${uniqueChains[0]}`);
    } else {
      observations.push(`${uniqueChains.length} different chain assignments`);
    }

    if (uniqueAddresses.length === 0) {
      observations.push("No address information available");
    } else if (uniqueAddresses.length === 1) {
      observations.push("Same address across records");
    } else {
      observations.push(`${uniqueAddresses.length} different addresses`);
    }

    return {
      uniqueNames,
      uniqueChains,
      uniqueAddresses,
      coordSpreadNote,
      observations,
    };
  };

  const summary = computeDifferenceSummary();

  return (
    <Card className={`${styles.bg} border-2 ${styles.border} mb-3`}>
      <CardContent className="pt-4">
        {/* Preview-only warning banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <strong>Preview only.</strong> Curator review — no automated actions.
          </div>
        </div>

        {/* Header with better hierarchy */}
        <div className="mb-3">
          {/* Classification title */}
          <h3 className="text-lg font-bold text-slate-900 mb-2">{styles.label}</h3>
          
          {/* Metadata badges on one line */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge className={confidenceBg} className="text-xs">
              {group.confidence === 'HIGH' ? '🔴' : group.confidence === 'MEDIUM' ? '🟡' : '🔵'} {group.confidence}
            </Badge>
            {group.distance_meters > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <MapPin size={12} />
                {group.distance_meters}m
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {group.stations.length} record{group.stations.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Explanation */}
          <p className="text-sm text-slate-700 leading-relaxed">{group.explanation}</p>
        </div>

        {/* Difference Summary - Read-Only Comparison */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3">
          <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase">Difference Summary</h4>
          
          {/* Coordinate spread */}
          <div className="mb-2.5 pb-2.5 border-b border-slate-200">
            <p className="text-xs text-slate-600 font-medium mb-1">📍 Location Variance</p>
            <p className="text-xs text-slate-700">{summary.coordSpreadNote}</p>
          </div>

          {/* Names */}
          <div className="mb-2.5 pb-2.5 border-b border-slate-200">
            <p className="text-xs text-slate-600 font-medium mb-1">📛 Station Names ({summary.uniqueNames.length})</p>
            <div className="space-y-1">
              {summary.uniqueNames.map((name, idx) => (
                <p key={idx} className="text-xs text-slate-700 bg-slate-50 px-2 py-1 rounded">
                  {name}
                </p>
              ))}
            </div>
          </div>

          {/* Chains */}
          <div className="mb-2.5 pb-2.5 border-b border-slate-200">
            <p className="text-xs text-slate-600 font-medium mb-1">🏷️ Chains ({summary.uniqueChains.length})</p>
            {summary.uniqueChains.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No chain information</p>
            ) : (
              <div className="space-y-1">
                {summary.uniqueChains.map((chain, idx) => (
                  <p key={idx} className="text-xs text-slate-700 bg-slate-50 px-2 py-1 rounded">
                    {chain}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Addresses */}
          <div className="mb-2">
            <p className="text-xs text-slate-600 font-medium mb-1">🏢 Addresses ({summary.uniqueAddresses.length})</p>
            {summary.uniqueAddresses.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No address information</p>
            ) : (
              <div className="space-y-1">
                {summary.uniqueAddresses.map((addr, idx) => (
                  <p key={idx} className="text-xs text-slate-700 bg-slate-50 px-2 py-1 rounded line-clamp-2">
                    {addr}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Quick observations */}
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-600 font-medium mb-1">ℹ️ At a Glance</p>
            <ul className="space-y-0.5">
              {summary.observations.map((obs, idx) => (
                <li key={idx} className="text-xs text-slate-700">
                  • {obs}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Expand/collapse button with better styling */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left text-sm font-medium text-slate-700 hover:text-slate-900 py-2 px-2 -mx-2 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <span>{expanded ? 'Hide' : 'Show'} station details</span>
          </span>
        </button>

        {/* Stations detail list */}
        {expanded && (
          <div className="space-y-2.5 bg-slate-50 -mx-4 -mb-4 px-4 py-3 rounded-b-lg border-t-2 border-current border-opacity-10">
            {group.stations.map((station, idx) => (
              <div key={station.id} className="bg-white rounded-lg p-3 border border-slate-200 hover:border-slate-300 transition-colors">
                {/* Station header with number and name */}
                <div className="flex items-start gap-3 mb-2.5">
                  <div className="flex-shrink-0 bg-slate-200 text-slate-700 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm break-words">{station.name}</div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {station.chain && station.chain !== 'unknown' && (
                        <Badge variant="outline" className="text-xs">
                          Chain: {station.chain}
                        </Badge>
                      )}
                      {idx > 0 && group.stations[0].name !== station.name && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          ⚠️ Name differs
                        </Badge>
                      )}
                      {idx > 0 && group.stations[0].chain !== station.chain && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          ⚠️ Chain differs
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metadata grid - cleaner layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t pt-2.5">
                  {station.address && (
                    <div>
                      <p className="text-slate-500 font-semibold uppercase text-xs">Address</p>
                      <p className="text-slate-700 mt-0.5">{station.address}</p>
                    </div>
                  )}
                  {station.latitude && station.longitude && (
                    <div>
                      <p className="text-slate-500 font-semibold uppercase text-xs">GPS Coordinates</p>
                      <p className="text-slate-700 font-mono text-xs mt-0.5">
                        {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                      </p>
                    </div>
                  )}
                  {station.sourceName && (
                    <div>
                      <p className="text-slate-500 font-semibold uppercase text-xs">Data Source</p>
                      <p className="text-slate-700 mt-0.5">{station.sourceName}</p>
                    </div>
                  )}
                </div>

                {/* Footer with ID and dates */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500 flex-wrap">
                  <span className="font-mono bg-slate-100 px-2 py-1 rounded">ID: {station.id.substring(0, 8)}...</span>
                  {station.created_date && (
                    <span>Added: {new Date(station.created_date).toLocaleDateString('nb-NO')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}