import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, MapPin, Fuel, Loader2 } from "lucide-react";

const CHAINS = ["Circle K", "Uno-X", "Esso", "Shell", "YX", "Best", "Annet"];
const FUEL_TYPES = [
  { value: "bensin_95", label: "Bensin 95" },
  { value: "bensin_98", label: "Bensin 98" },
  { value: "diesel", label: "Diesel" },
  { value: "diesel_premium", label: "Diesel Premium" },
];

// Render one price row per detected fuel type
function PriceRow({ fuelType, price, aiDetected, onChange }) {
  return (
    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-500 mb-1">
          {FUEL_TYPES.find(f => f.value === fuelType)?.label}
        </p>
        <Input
          type="number"
          step="0.01"
          min="10"
          max="30"
          value={price}
          onChange={e => onChange(e.target.value)}
          className="font-bold text-lg h-10"
          required={price !== ""}
        />
      </div>
      {aiDetected && (
        <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-4" />
      )}
    </div>
  );
}

export default function ConfirmPrice({ detectedPrices, setDetectedPrices, stationInfo, setStationInfo, imageUrl, onSubmit, loading, locationLoading }) {
  const setStation = (field, value) => setStationInfo(prev => ({ ...prev, [field]: value }));

  const activePrices = Object.entries(detectedPrices).filter(([, v]) => v.enabled);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Fuel className="text-blue-600" size={24} />
          Bekreft og send inn
        </CardTitle>
        <p className="text-slate-500 text-sm">Sjekk at prisene stemmer, fjern de du ikke vil logge.</p>
      </CardHeader>
      <CardContent>
        {imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden border border-slate-200">
            <img src={imageUrl} alt="Prisbilde" className="w-full max-h-48 object-cover" />
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* All detected prices */}
          <div>
            <Label className="mb-2 block">
              Priser fra bildet
              {Object.values(detectedPrices).some(v => v.aiDetected) && (
                <span className="ml-2 text-xs text-green-600 font-normal flex-inline items-center gap-1">
                  <CheckCircle size={11} className="inline" /> AI-lest
                </span>
              )}
            </Label>
            <div className="space-y-2">
              {FUEL_TYPES.map(({ value, label }) => {
                const entry = detectedPrices[value];
                return (
                  <div key={value} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id={`chk-${value}`}
                      checked={entry.enabled}
                      onChange={e => setDetectedPrices(prev => ({
                        ...prev,
                        [value]: { ...prev[value], enabled: e.target.checked }
                      }))}
                      className="mt-3"
                    />
                    <label htmlFor={`chk-${value}`} className="flex-1">
                      <div className={`flex items-center gap-2 bg-slate-50 rounded-lg p-2 border ${entry.enabled ? "border-blue-200" : "border-slate-200 opacity-50"}`}>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-500">{label}</p>
                          <Input
                            type="number"
                            step="0.01"
                            min="10"
                            max="30"
                            value={entry.price}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setDetectedPrices(prev => ({
                              ...prev,
                              [value]: { ...prev[value], price: e.target.value, enabled: true }
                            }))}
                            placeholder="–"
                            className="font-bold text-base h-9 mt-1"
                            disabled={!entry.enabled}
                          />
                        </div>
                        {entry.aiDetected && entry.price && (
                          <CheckCircle size={15} className="text-green-500 flex-shrink-0 mt-4" />
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Station info */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1">
              <MapPin size={13} className="text-blue-500" /> Stasjon
              {locationLoading && <Loader2 size={13} className="animate-spin ml-1 text-slate-400" />}
            </Label>
            <Select value={stationInfo.station_chain} onValueChange={v => setStation("station_chain", v)}>
              <SelectTrigger><SelectValue placeholder="Velg kjede" /></SelectTrigger>
              <SelectContent>
                {CHAINS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>By *</Label>
              <Input
                placeholder="f.eks. Oslo"
                value={stationInfo.city}
                onChange={e => setStation("city", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Dato</Label>
              <Input
                type="date"
                value={stationInfo.date_observed}
                onChange={e => setStation("date_observed", e.target.value)}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
            disabled={loading || activePrices.length === 0}
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin mr-2" />Lagrer...</>
              : `✓ Del ${activePrices.length} pris${activePrices.length !== 1 ? "er" : ""} med community`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}