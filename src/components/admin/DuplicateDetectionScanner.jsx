import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader } from "lucide-react";

export default function DuplicateDetectionScanner({ onResults, onError }) {
  const [city, setCity] = useState("Trondheim");
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!city.trim()) {
      onError("By må fylles ut");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('detectStationDuplicates', {
        city: city.trim(),
      });
      onResults(response.data);
      onError(null);
    } catch (err) {
      onError(`Skanning feilet: ${err.message}`);
      onResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900">Skann etter duplikater</h3>
          <p className="text-xs text-slate-500 mt-0.5">Kun analyse og forhåndsvisning — ingen data endres.</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-3 text-xs text-slate-600">
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Velg by</li>
          <li>Kjør skann</li>
          <li>Vurder grupper og risikonivå</li>
          <li>Send videre til forhåndsvisning av opprydding</li>
        </ol>
      </div>

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
          {loading ? (
            <>
              <Loader size={16} className="animate-spin mr-2" />
              Skanner...
            </>
          ) : (
            <>
              <Search size={16} className="mr-2" />
              Kjør duplikatskann
            </>
          )}
        </Button>
      </div>
    </div>
  );
}