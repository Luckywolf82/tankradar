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

export default function ConfirmPrice({ form, setForm, imageUrl, onSubmit, loading, locationLoading }) {
  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Fuel className="text-blue-600" size={24} />
          Bekreft og send inn
        </CardTitle>
        <p className="text-slate-500 text-sm">Sjekk at informasjonen stemmer før du deler.</p>
      </CardHeader>
      <CardContent>
        {imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden border border-slate-200">
            <img src={imageUrl} alt="Prisbilde" className="w-full max-h-48 object-cover" />
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Price */}
          <div className="space-y-1">
            <Label>Pris per liter (kr) *</Label>
            <Input
              type="number"
              step="0.01"
              min="10"
              max="30"
              placeholder="f.eks. 18.49"
              value={form.price}
              onChange={e => set("price", e.target.value)}
              required
              className="text-2xl font-bold h-12"
            />
            {form.ai_detected && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle size={12} /> AI leste denne prisen automatisk
              </p>
            )}
          </div>

          {/* Fuel type */}
          <div className="space-y-1">
            <Label>Drivstofftype *</Label>
            <Select value={form.fuel_type} onValueChange={v => set("fuel_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUEL_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Station info */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1">
              <MapPin size={13} className="text-blue-500" /> Stasjon
              {locationLoading && <Loader2 size={13} className="animate-spin ml-1 text-slate-400" />}
            </Label>
            <Select value={form.station_chain} onValueChange={v => set("station_chain", v)}>
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
                value={form.city}
                onChange={e => set("city", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Dato</Label>
              <Input
                type="date"
                value={form.date_observed}
                onChange={e => set("date_observed", e.target.value)}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
            disabled={loading}
          >
            {loading ? <><Loader2 size={18} className="animate-spin mr-2" />Lagrer...</> : "✓ Del pris med community"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}