import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import DuplicateStationGroup from "./DuplicateStationGroup";

const CLASSIFICATION_CONFIG = [
  {
    key: "exact_coordinate_duplicate",
    label: "🔴 Exact Coordinate Duplicates",
    badgeColor: "text-red-700 bg-red-50 border-red-200",
    headerColor: "bg-red-50 border-red-200",
  },
  {
    key: "exact_name_chain_duplicate",
    label: "🟠 Same Location, Different Names/Chains",
    badgeColor: "text-orange-700 bg-orange-50 border-orange-200",
    headerColor: "bg-orange-50 border-orange-200",
  },
  {
    key: "possible_near_duplicate",
    label: "🟡 Possible Near-Duplicates",
    badgeColor: "text-yellow-700 bg-yellow-50 border-yellow-200",
    headerColor: "bg-yellow-50 border-yellow-200",
  },
];

function ClassificationSection({ config, groups, expanded, onToggle }) {
  const count = groups.length;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:brightness-95 ${config.headerColor} border-b border-slate-200`}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={16} className="text-slate-600 flex-shrink-0" /> : <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />}
          <span className="text-sm font-semibold text-slate-900">{config.label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${config.badgeColor}`}>
          {count} group{count !== 1 ? "s" : ""}
        </span>
      </button>
      {expanded && (
        <div className={`p-4 space-y-4 bg-white ${count === 0 ? "text-center py-6" : ""}`}>
          {count === 0 ? (
            <p className="text-sm text-slate-500">No groups match current filters.</p>
          ) : (
            groups.map((group, idx) => (
              <DuplicateStationGroup key={`${group.classification}-${index}-${idx}`} group={group} index={idx} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function DuplicateDetectionResults({ results }) {
  const [showWhyGrouped, setShowWhyGrouped] = useState(false);
  const [selectedClassifications, setSelectedClassifications] = useState({
    exact_coordinate_duplicate: true,
    exact_name_chain_duplicate: true,
    possible_near_duplicate: true,
  });
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("confidence");
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Section expand/collapse is managed per ClassificationSection instance
  // Reset filters: isFiltered + handleResetFilters implemented (Entry 5 — re-committed 2026-03-10)

  const isFiltered =
    !selectedClassifications.exact_coordinate_duplicate ||
    !selectedClassifications.exact_name_chain_duplicate ||
    !selectedClassifications.possible_near_duplicate ||
    confidenceFilter !== "all" ||
    sortBy !== "confidence" ||
    searchTerm !== "" ||
    showWhyGrouped !== false;

  const handleResetFilters = () => {
    setSelectedClassifications({
      exact_coordinate_duplicate: true,
      exact_name_chain_duplicate: true,
      possible_near_duplicate: true,
    });
    setConfidenceFilter("all");
    setSortBy("confidence");
    setSearchTerm("");
    setShowWhyGrouped(false);
  };

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
  const search = searchTerm.toLowerCase().trim();
  let filtered = duplicate_groups.filter(g => {
    const classMatch = selectedClassifications[g.classification];
    const confMatch = confidenceFilter === "all" || g.confidence === confidenceFilter;
    if (!classMatch || !confMatch) return false;
    if (!search) return true;
    const inClassification = (g.classification || "").toLowerCase().includes(search);
    const inExplanation = (g.explanation || "").toLowerCase().includes(search);
    const inStations = (g.stations || []).some(s =>
      (s.name || "").toLowerCase().includes(search) ||
      (s.chain || "").toLowerCase().includes(search) ||
      (s.address || "").toLowerCase().includes(search) ||
      (s.sourceName || "").toLowerCase().includes(search)
    );
    return inClassification || inExplanation || inStations;
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

  // Generate plain-text summary for curator export
  const generateCuratorSummary = () => {
    const now = new Date().toISOString();
    const classificationCounts = {
      exact_coordinate_duplicate: 0,
      exact_name_chain_duplicate: 0,
      possible_near_duplicate: 0,
    };

    filtered.forEach(g => {
      classificationCounts[g.classification]++;
    });

    let summary = `DUPLICATE CATALOG SCAN SUMMARY\n`;
    summary += `==============================\n\n`;
    summary += `City: ${city}\n`;
    summary += `Scan Date: ${now}\n`;
    summary += `Filter State: Classifications=${Object.keys(selectedClassifications).filter(k => selectedClassifications[k]).join(', ') || 'none'}, Confidence=${confidenceFilter}, Sort=${sortBy}, Search="${searchTerm || ''}"\n\n`;
    summary += `RESULTS\n`;
    summary += `-------\n`;
    summary += `Total Groups (after filtering): ${filtered.length}\n`;
    summary += `  • Exact Coordinate Duplicates: ${classificationCounts.exact_coordinate_duplicate}\n`;
    summary += `  • Same Location, Different Names/Chains: ${classificationCounts.exact_name_chain_duplicate}\n`;
    summary += `  • Possible Near-Duplicates: ${classificationCounts.possible_near_duplicate}\n\n`;

    if (filtered.length > 0) {
      summary += `GROUPS DETAILS\n`;
      summary += `--------------\n\n`;
      filtered.forEach((group, idx) => {
        const classLabel = {
          exact_coordinate_duplicate: '🔴 EXACT',
          exact_name_chain_duplicate: '🟠 SAME LOC',
          possible_near_duplicate: '🟡 NEAR',
        }[group.classification] || '?';

        summary += `Group ${idx + 1}: ${classLabel} | ${group.distance_meters}m | ${group.confidence} | ${group.stations.length} records\n`;
        summary += `  Reason: ${group.explanation}\n`;

        group.stations.forEach((station, sIdx) => {
          summary += `    [${sIdx + 1}] ${station.name}`;
          if (station.chain && station.chain !== 'unknown') {
            summary += ` (${station.chain})`;
          }
          summary += `\n`;
          if (station.address) summary += `        Address: ${station.address}\n`;
          if (station.latitude && station.longitude) {
            summary += `        GPS: ${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}\n`;
          }
          if (station.sourceName) summary += `        Source: ${station.sourceName}\n`;
        });
        summary += `\n`;
      });
    }

    summary += `CURATOR NOTE\n`;
    summary += `------------\n`;
    summary += `This summary is for manual review only. No records have been modified.\n`;
    summary += `All decisions require explicit governance approval.\n`;

    return summary;
  };

  const handleCopySummary = async () => {
    const text = generateCuratorSummary();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch (err) {
      console.error("Failed to copy summary:", err);
    }
  };

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
              <label className="text-xs font-semibold text-slate-900 block mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search names, chains, addresses, or explanation"
                className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-lg bg-white placeholder:text-slate-400"
              />
            </div>

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

            {isFiltered && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary with export button */}
      <Card className="mb-4">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Scan Summary</CardTitle>
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
            title="Copy plain-text summary for manual review"
          >
            {copiedSummary ? (
              <>
                <Check size={14} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Summary</span>
              </>
            )}
          </button>
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

      {/* Filtered summary strip */}
      {!hasNoDuplicates && duplicate_groups.length > 0 && (
        <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 items-center">
          <span className="font-semibold text-slate-800">{filtered.length} group{filtered.length !== 1 ? "s" : ""} visible</span>
          <span>🔴 {filtered.filter(g => g.classification === "exact_coordinate_duplicate").length} exact</span>
          <span>🟠 {filtered.filter(g => g.classification === "exact_name_chain_duplicate").length} same-loc</span>
          <span>🟡 {filtered.filter(g => g.classification === "possible_near_duplicate").length} near</span>
          {confidenceFilter !== "all" && <span className="text-slate-500">Confidence: <strong>{confidenceFilter}</strong></span>}
          <span className="text-slate-500">Sort: <strong>{sortBy}</strong></span>
          {searchTerm && <span className="text-slate-500">Search: <strong>"{searchTerm}"</strong></span>}
        </div>
      )}

      {/* Results by classification */}
      {hasNoDuplicates ? (
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
            <p className="text-slate-700">No duplicates match current filters{search ? ` or search "${searchTerm}"` : ""}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {CLASSIFICATION_CONFIG.map((config, i) => {
            const sectionGroups = filtered.filter(g => g.classification === config.key);
            // Hide section entirely only if classification toggle is off and count is 0
            if (sectionGroups.length === 0 && !selectedClassifications[config.key]) return null;
            return (
              <ClassificationSection
                key={config.key}
                config={config}
                groups={sectionGroups}
                index={i}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}