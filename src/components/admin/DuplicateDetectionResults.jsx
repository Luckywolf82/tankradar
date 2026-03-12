import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import DuplicateStationGroup from "./DuplicateStationGroup";

const CLASSIFICATION_CONFIG = [
  {
    key: "exact_coordinate_duplicate",
    label: "🔴 Eksakte koordinatduplikater",
    badgeColor: "text-red-700 bg-red-50 border-red-200",
    headerColor: "bg-red-50 border-red-200",
  },
  {
    key: "exact_name_chain_duplicate",
    label: "🟠 Samme område, ulike navn eller kjeder",
    badgeColor: "text-orange-700 bg-orange-50 border-orange-200",
    headerColor: "bg-orange-50 border-orange-200",
  },
  {
    key: "possible_near_duplicate",
    label: "🟡 Mulige nærliggende duplikater",
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
          {count} gruppe{count !== 1 ? "r" : ""}
        </span>
      </button>
      {expanded && (
        <div className={`p-4 space-y-4 bg-white ${count === 0 ? "text-center py-6" : ""}`}>
          {count === 0 ? (
            <p className="text-sm text-slate-500">Ingen grupper matcher gjeldende filter.</p>
          ) : (
            groups.map((group, idx) => (
              <DuplicateStationGroup key={`${group.classification}-${idx}`} group={group} index={idx} />
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
  const [sectionExpanded, setSectionExpanded] = useState({
    exact_coordinate_duplicate: true,
    exact_name_chain_duplicate: true,
    possible_near_duplicate: true,
  });

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
          <p className="text-slate-700">Ingen stasjoner funnet for denne byen.</p>
        </CardContent>
      </Card>
    );
  }

  const { summary, duplicate_groups, city } = results;
  const hasNoDuplicates = !duplicate_groups || duplicate_groups.length === 0;

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

  const generateCuratorSummary = () => {
    const now = new Date().toISOString();
    const classificationCounts = {
      exact_coordinate_duplicate: 0,
      exact_name_chain_duplicate: 0,
      possible_near_duplicate: 0,
    };

    filtered.forEach(g => { classificationCounts[g.classification]++; });

    let text = `DUPLIKATSKANN-OPPSUMMERING\n`;
    text += `==========================\n\n`;
    text += `By: ${city}\n`;
    text += `Skann-dato: ${now}\n`;
    text += `Filterstate: Klassifisering=${Object.keys(selectedClassifications).filter(k => selectedClassifications[k]).join(', ') || 'ingen'}, Konfidens=${confidenceFilter}, Sortering=${sortBy}, Søk="${searchTerm || ''}"\n\n`;
    text += `RESULTATER\n-----------\n`;
    text += `Totale grupper (etter filter): ${filtered.length}\n`;
    text += `  • Eksakte koordinatduplikater: ${classificationCounts.exact_coordinate_duplicate}\n`;
    text += `  • Samme område, ulike navn/kjeder: ${classificationCounts.exact_name_chain_duplicate}\n`;
    text += `  • Mulige nærliggende duplikater: ${classificationCounts.possible_near_duplicate}\n\n`;

    if (filtered.length > 0) {
      text += `GRUPPEDETALJER\n--------------\n\n`;
      filtered.forEach((group, idx) => {
        const classLabel = {
          exact_coordinate_duplicate: '🔴 EKSAKT',
          exact_name_chain_duplicate: '🟠 SAMME STED',
          possible_near_duplicate: '🟡 NÆRLIGGENDE',
        }[group.classification] || '?';

        text += `Gruppe ${idx + 1}: ${classLabel} | ${group.distance_meters}m | ${group.confidence} | ${group.stations.length} stasjoner\n`;
        text += `  Årsak: ${group.explanation}\n`;

        group.stations.forEach((station, sIdx) => {
          text += `    [${sIdx + 1}] ${station.name}`;
          if (station.chain && station.chain !== 'unknown') text += ` (${station.chain})`;
          text += `\n`;
          if (station.address) text += `        Adresse: ${station.address}\n`;
          if (station.latitude && station.longitude) {
            text += `        GPS: ${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}\n`;
          }
          if (station.sourceName) text += `        Kilde: ${station.sourceName}\n`;
        });
        text += `\n`;
      });
    }

    text += `KURATORNOTE\n-----------\n`;
    text += `Denne oppsummeringen er kun for manuell gjennomgang. Ingen poster er endret.\n`;
    text += `Alle beslutninger krever eksplisitt governance-godkjennelse.\n`;

    return text;
  };

  const handleCopySummary = async () => {
    const text = generateCuratorSummary();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch (err) {
      console.error("Klarte ikke å kopiere oppsummering:", err);
    }
  };

  return (
    <div>
      {/* Step guide */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-700 mb-1">Arbeidssteg</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Steg 2: Se grupper og risiko</li>
          <li>Steg 3: Filtrer og prioriter</li>
          <li>Steg 4: Send videre til forhåndsvisning av deduplisering</li>
        </ol>
      </div>

      {/* Preview banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
        <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <strong>Kun forhåndsvisning.</strong> Denne skanningen identifiserer mulige duplikate stasjonsposter basert på GPS-nærhet og navn/kjede-matching.
          Ingen poster slås sammen, slettes eller endres automatisk.
          <div className="mt-1 text-xs text-amber-800">
            Manuell kuratorgranskning og eksplisitt governance-godkjennelse kreves før sammenslåing.
          </div>
        </div>
      </div>

      {/* Hvorfor gruppert */}
      <div className="mb-4">
        <button
          onClick={() => setShowWhyGrouped(!showWhyGrouped)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700 mb-2"
        >
          <ChevronDown size={16} className={`transition-transform ${showWhyGrouped ? 'rotate-180' : ''}`} />
          Hvorfor er disse gruppert?
        </button>
        {showWhyGrouped && (
          <Card className="bg-slate-50 border border-slate-200 mb-3">
            <CardContent className="pt-4 space-y-3 text-sm text-slate-700">
              <div>
                <p className="font-medium text-slate-900 mb-1">🔴 Eksakte koordinatduplikater</p>
                <p className="text-xs">Stasjonsposter på identiske GPS-koordinater. Sannsynligvis samme fysiske sted registrert flere ganger (datainntastingsfeil, importsammenslåing, eller duplikate kilder).</p>
              </div>
              <div>
                <p className="font-medium text-slate-900 mb-1">🟠 Samme område, ulike navn eller kjeder</p>
                <p className="text-xs">Stasjonsposter på identiske koordinater, men med ulike navn eller kjedekoblinger. Kan skyldes merkevarebytte, operatørendringer, eller dataavvik fra ulike kilder.</p>
              </div>
              <div>
                <p className="font-medium text-slate-900 mb-1">🟡 Mulige nærliggende duplikater</p>
                <p className="text-xs">Stasjoner innenfor ~50m nærhet med like eller identiske navn/kjeder. Kan være separate lokasjoner (pumper, avdelinger) eller duplikater — kuratorbedømmelse nødvendig.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter Controls */}
      <Card className="mb-4 bg-slate-50 border border-slate-200">
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-900 block mb-1">Søk i grupper</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Søk på navn, kjede, adresse eller forklaring"
                className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-lg bg-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-900 mb-2">Filtrer etter klassifisering</p>
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
                      {cls === 'exact_coordinate_duplicate' && '🔴 Eksakt koordinat'}
                      {cls === 'exact_name_chain_duplicate' && '🟠 Samme sted'}
                      {cls === 'possible_near_duplicate' && '🟡 Nærliggende'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-900 block mb-1">Konfidens</label>
                <select
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value)}
                  className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">Alle konfidensnivåer</option>
                  <option value="HIGH">🔴 Kun HØY</option>
                  <option value="MEDIUM">🟡 Kun MEDIUM</option>
                  <option value="LOW">🔵 Kun LAV</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-900 block mb-1">Sorter etter</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="confidence">Konfidens</option>
                  <option value="size">Gruppestørrelse</option>
                  <option value="distance">Avstand</option>
                </select>
              </div>
            </div>

            {isFiltered && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors"
                >
                  Nullstill filter
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mb-4">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Skann-oppsummering</CardTitle>
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
            title="Kopier ren tekst-oppsummering for manuell gjennomgang"
          >
            {copiedSummary ? (
              <>
                <Check size={14} />
                <span>Kopiert!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Kopier oppsummering</span>
              </>
            )}
          </button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-1">Skann av <strong>{city}</strong></p>
            <p className="text-sm text-slate-700">
              Fant <strong>{summary.total_stations}</strong> stasjoner totalt.
              {summary.exact_coordinate_duplicates + summary.exact_name_chain_duplicates + summary.possible_near_duplicates === 0
                ? " Ingen duplikater oppdaget."
                : ` Identifiserte ${summary.exact_coordinate_duplicates + summary.exact_name_chain_duplicates + summary.possible_near_duplicates} mulig(e) duplikatklynge(r).`}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t pt-3">
            <div>
              <p className="text-xs text-slate-600 font-medium">Eksakt koordinat</p>
              <p className="text-lg font-bold text-red-600">{summary.exact_coordinate_duplicates}</p>
              <p className="text-xs text-slate-500 mt-0.5">Samme GPS (identisk)</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Samme sted</p>
              <p className="text-lg font-bold text-orange-600">{summary.exact_name_chain_duplicates}</p>
              <p className="text-xs text-slate-500 mt-0.5">Ulike navn/kjeder</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Nærliggende</p>
              <p className="text-lg font-bold text-yellow-600">{summary.possible_near_duplicates}</p>
              <p className="text-xs text-slate-500 mt-0.5">Nær nok (&lt;50m)</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Totale klynger</p>
              <p className="text-lg font-bold text-slate-900">{summary.exact_coordinate_duplicates + summary.exact_name_chain_duplicates + summary.possible_near_duplicates}</p>
              <p className="text-xs text-slate-500 mt-0.5">Krever gjennomgang</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtered strip */}
      {!hasNoDuplicates && duplicate_groups.length > 0 && (
        <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 items-center">
          <span className="font-semibold text-slate-800">{filtered.length} gruppe{filtered.length !== 1 ? "r" : ""} synlig</span>
          <span>🔴 {filtered.filter(g => g.classification === "exact_coordinate_duplicate").length} eksakt</span>
          <span>🟠 {filtered.filter(g => g.classification === "exact_name_chain_duplicate").length} samme sted</span>
          <span>🟡 {filtered.filter(g => g.classification === "possible_near_duplicate").length} nærliggende</span>
          {confidenceFilter !== "all" && <span className="text-slate-500">Konfidens: <strong>{confidenceFilter}</strong></span>}
          <span className="text-slate-500">Sortering: <strong>{sortBy}</strong></span>
          {searchTerm && <span className="text-slate-500">Søk: <strong>"{searchTerm}"</strong></span>}
        </div>
      )}

      {/* Results */}
      {hasNoDuplicates ? (
        <Card className="bg-green-50 border border-green-200">
          <CardContent className="pt-6 text-center">
            <Info size={20} className="mx-auto text-green-600 mb-2" />
            <p className="text-slate-700 font-medium">Ingen duplikater oppdaget</p>
            <p className="text-sm text-slate-600">Katalogen ser ren ut for {city}.</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="bg-blue-50 border border-blue-200">
          <CardContent className="pt-6 text-center">
            <Info size={20} className="mx-auto text-blue-600 mb-2" />
            <p className="text-slate-700">Ingen duplikater matcher gjeldende filter{searchTerm ? ` eller søk "${searchTerm}"` : ""}.</p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex justify-end gap-3 mb-2">
            <button
              onClick={() => setSectionExpanded({ exact_coordinate_duplicate: true, exact_name_chain_duplicate: true, possible_near_duplicate: true })}
              className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors"
            >
              Utvid alle
            </button>
            <button
              onClick={() => setSectionExpanded({ exact_coordinate_duplicate: false, exact_name_chain_duplicate: false, possible_near_duplicate: false })}
              className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors"
            >
              Skjul alle
            </button>
          </div>
          <div className="space-y-3">
            {CLASSIFICATION_CONFIG.map((config, i) => {
              const sectionGroups = filtered.filter(g => g.classification === config.key);
              if (sectionGroups.length === 0 && !selectedClassifications[config.key]) return null;
              return (
                <ClassificationSection
                  key={config.key}
                  config={config}
                  groups={sectionGroups}
                  index={i}
                  expanded={sectionExpanded[config.key]}
                  onToggle={() => setSectionExpanded(p => ({ ...p, [config.key]: !p[config.key] }))}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}