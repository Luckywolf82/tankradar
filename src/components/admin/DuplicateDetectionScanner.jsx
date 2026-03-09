import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search, Loader } from "lucide-react";

export default function DuplicateDetectionScanner({ onResults, onError }) {
  const [city, setCity] = useState("Trondheim");
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!city.trim()) {
      onError("City name is required");
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
      onError(`Scan failed: ${err.message}`);
      onResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
      <h3 className="font-semibold text-slate-900 mb-3">Scan for Duplicates</h3>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-600 mb-1">City</label>
          <Input
            placeholder="e.g., Trondheim"
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
              Scanning...
            </>
          ) : (
            <>
              <Search size={16} className="mr-2" />
              Scan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}