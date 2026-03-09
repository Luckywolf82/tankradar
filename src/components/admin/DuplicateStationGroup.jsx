import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, Link2 } from "lucide-react";

const classificationStyles = {
  EXACT_DUPLICATE: {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800",
    icon: "text-red-600",
  },
  COORDINATE_DUPLICATE: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-800",
    icon: "text-orange-600",
  },
  POSSIBLE_NEAR_DUPLICATE: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800",
    icon: "text-yellow-600",
  },
};

export default function DuplicateStationGroup({ group, index }) {
  const styles = classificationStyles[group.classification] || classificationStyles.EXACT_DUPLICATE;
  const confidenceBg = {
    HIGH: "bg-red-100 text-red-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    LOW: "bg-blue-100 text-blue-800",
  }[group.confidence] || "bg-slate-100 text-slate-800";

  return (
    <Card className={`${styles.bg} border-2 ${styles.border} mb-3`}>
      <CardContent className="pt-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 pb-3 border-b border-current border-opacity-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={styles.badge}>{group.classification}</Badge>
              <Badge className={confidenceBg}>{group.confidence} confidence</Badge>
            </div>
            <p className="text-sm text-slate-700">{group.reason}</p>
          </div>
          {group.distance_meters > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">Distance</p>
              <p className="font-semibold text-slate-900">{group.distance_meters}m</p>
            </div>
          )}
        </div>

        {/* Stations */}
        <div className="space-y-2">
          {group.stations.map((station, idx) => (
            <div key={station.id} className="bg-white rounded p-2 border border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Station info */}
                  <div className="font-medium text-slate-900 text-sm">{station.name}</div>
                  
                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-2 mt-1.5 text-xs">
                    {station.chain && station.chain !== 'unknown' && (
                      <div>
                        <span className="text-slate-500">Chain:</span>
                        <span className="ml-1 font-medium text-slate-700">{station.chain}</span>
                      </div>
                    )}
                    {station.address && (
                      <div>
                        <span className="text-slate-500">Address:</span>
                        <span className="ml-1 text-slate-700">{station.address}</span>
                      </div>
                    )}
                    {station.latitude && station.longitude && (
                      <div>
                        <span className="text-slate-500">GPS:</span>
                        <span className="ml-1 text-slate-700">
                          {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                        </span>
                      </div>
                    )}
                    {station.sourceName && (
                      <div>
                        <span className="text-slate-500">Source:</span>
                        <span className="ml-1 text-slate-700">{station.sourceName}</span>
                      </div>
                    )}
                  </div>

                  {/* ID and created date */}
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">{station.id.substring(0, 8)}...</span>
                    {station.created_date && (
                      <span>Created: {new Date(station.created_date).toLocaleDateString('nb-NO')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Review action note */}
        <div className="mt-3 p-2 bg-slate-50 rounded text-xs text-slate-600 border-l-2 border-slate-300">
          <strong>Review action:</strong> {group.review_action}
        </div>
      </CardContent>
    </Card>
  );
}