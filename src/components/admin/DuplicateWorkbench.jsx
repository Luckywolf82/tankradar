import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader, ChevronRight } from "lucide-react";
import DuplicateDetectionResults from "./DuplicateDetectionResults";
import DuplicateRemediationPanel from "./DuplicateRemediationPanel";

const STEPS = [
  { id: "scan", label: "Skann" },
  { id: "inspect", label: "Se resultater" },
  { id: "remediation", label: "Forhåndsvisning" },
];

export default function DuplicateWorkbench() {
  const [city, setCity] = useState("Trondheim");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("scan");

  const handleScan = async () => {
    if (!city.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await base44.functions.invoke('detectStationDuplicates', { city: city.trim() });
      setResults(response.data);
      setStep("inspect");
    } catch (err) {
      setError(`Scan feilet: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <span className={`font-medium px-2 py-1 rounded ${step === s ? "bg-blue-100 text-blue-700" : "text-slate-400"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < STEPS.length - 1 && <ChevronRight size={12} />}
          </React.Fragment>
        ))}
      </div>

      {/* Scan step */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-1">Scan for duplikater</h3>
        <p className="text-xs text-slate-500 mb-3">Preview-analyse kun — ingen dataendringer</p>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">By</label>
            <Input
              placeholder="f.eks. Trondheim"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleScan}
            disabled={loading || !city.trim()}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {loading ? <><Loader size={16} className="animate-spin mr-2" />Skanner...</> : <><Search size={16} className="mr-2" />Scan</>}
          </Button>
        </div>
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">{error}</div>
        )}
      </div>

      {/* Inspect step */}
      {results && (
        <div>
          <DuplicateDetectionResults results={results} />
          <div className="mt-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setStep("remediation")}>
              Gå til Remediation →
            </Button>
          </div>
        </div>
      )}

      {/* Remediation step */}
      {step === "remediation" && (
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Duplikatretting — Phase 3</p>
            <span className="text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5">Preview only</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">Ingen merge- eller slettehandlinger er aktivert.</p>
          <DuplicateRemediationPanel />
        </div>
      )}
    </div>
  );
}