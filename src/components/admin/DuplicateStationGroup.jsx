import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, Link2 } from "lucide-react";

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
    label: "Same Coordinates, Different Names",
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

  return (
    <Card className={`${styles.bg} border-2 ${styles.border} mb-3`}>
      <CardContent className="pt-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 pb-3 border-b border-current border-opacity-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={styles.badge}>{styles.label}</Badge>
              <Badge className={confidenceBg}>
                {group.confidence === 'HIGH' ? '🔴' : group.confidence === 'MEDIUM' ? '🟡' : '🔵'} {group.confidence} confidence
              </Badge>
              {group.distance_meters > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin size={12} />
                  {group.distance_meters}m apart
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{group.explanation}</p>
          </div>
        </div>

        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium text-slate-700 hover:text-slate-900 mb-3 flex items-center gap-1.5"
        >
          <span className="text-xs">{expanded ? '▼' : '▶'}</span>
          <span className="font-medium">{group.stations.length} station{group.stations.length !== 1 ? 's' : ''} in group</span>
          {!expanded && <span className="text-xs text-slate-500">(click to view details)</span>}
        </button>

        {/* Stations */}
        {expanded && (
        <div className="space-y-2.5 bg-slate-50 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
          {group.stations.map((station, idx) => (
            <div key={station.id} className="bg-white rounded-lg p-3 border border-slate-200 hover:border-slate-300 transition-colors">
              {/* Station name + index */}
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-shrink-0 bg-slate-200 text-slate-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 text-sm">{station.name}</div>
                  {station.chain && station.chain !== 'unknown' && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Chain: <span className="font-medium text-slate-700">{station.chain}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs border-t pt-2">
                {station.address && (
                  <div className="sm:col-span-2">
                    <p className="text-slate-500 font-medium">Address</p>
                    <p className="text-slate-700">{station.address}</p>
                  </div>
                )}
                {station.latitude && station.longitude && (
                  <div>
                    <p className="text-slate-500 font-medium">GPS</p>
                    <p className="text-slate-700 font-mono text-xs">
                      {station.latitude.toFixed(4)}
                    </p>
                    <p className="text-slate-700 font-mono text-xs">
                      {station.longitude.toFixed(4)}
                    </p>
                  </div>
                )}
                {station.sourceName && (
                  <div>
                    <p className="text-slate-500 font-medium">Source</p>
                    <p className="text-slate-700">{station.sourceName}</p>
                  </div>
                )}
              </div>

              {/* ID and created date footer */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{station.id.substring(0, 12)}...</span>
                {station.created_date && (
                  <span>Created: {new Date(station.created_date).toLocaleDateString('nb-NO')}</span>
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