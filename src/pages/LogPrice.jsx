import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Fuel, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const CHAINS = ["Circle K", "Uno-X", "Esso", "Shell", "YX", "Best", "Annet"];
const FUEL_TYPES = [
  { value: "bensin_95", label: "Bensin 95" },
  { value: "bensin_98", label: "Bensin 98" },
  { value: "diesel", label: "Diesel" },
  { value: "diesel_premium", label: "Diesel Premium" },
];
const REGIONS = [
  "Oslo og Akershus", "Innlandet", "Viken", "Vestfold og Telemark",
  "Agder", "Rogaland", "Vestland", "Møre og Romsdal",
  "Trøndelag", "Nordland", "Troms", "Finnmark"
];

export default function LogPrice() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    price: "",
    fuel_type: "bensin_95",
    station_chain: "",
    station_name: "",
    city: "",
    region: "",
    date_observed: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.FuelPrice.create({
      ...form,
      price: parseFloat(form.price),
    });
    setSaved(true);
    setLoading(false);
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardContent className="pt-10 pb-8">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={56} />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Takk for bidraget!</h2>
            <p className="text-slate-500 mb-6">Prisen din er lagret og hjelper andre norske bilister.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setSaved(false); setForm(f => ({ ...f, price: "" })); }}>
                Logg en til
              </Button>
              <Link to={createPageUrl("Dashboard")}>
                <Button className="bg-blue-600 hover:bg-blue-700">Se statistikk</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <Link to={createPageUrl("Dashboard")} className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 mb-6 text-sm">
          <ArrowLeft size={16} /> Tilbake til oversikt
        </Link>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Fuel className="text-blue-600" size={24} />
              Registrer drivstoffpris
            </CardTitle>
            <p className="text-slate-500 text-sm">Del prisen du har sett – hjelp andre bilister!</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  />
                </div>
                <div className="space-y-1">
                  <Label>Drivstofftype *</Label>
                  <Select value={form.fuel_type} onValueChange={v => set("fuel_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Kjede *</Label>
                  <Select value={form.station_chain} onValueChange={v => set("station_chain", v)}>
                    <SelectTrigger><SelectValue placeholder="Velg kjede" /></SelectTrigger>
                    <SelectContent>
                      {CHAINS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Stasjonsnavn (valgfritt)</Label>
                  <Input
                    placeholder="f.eks. Circle K Majorstua"
                    value={form.station_name}
                    onChange={e => set("station_name", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <Label>Region</Label>
                  <Select value={form.region} onValueChange={v => set("region", v)}>
                    <SelectTrigger><SelectValue placeholder="Velg region" /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Dato observert *</Label>
                <Input
                  type="date"
                  value={form.date_observed}
                  onChange={e => set("date_observed", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Notater (valgfritt)</Label>
                <Textarea
                  placeholder="f.eks. kampanjepris, medlemspris..."
                  value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
                disabled={loading}
              >
                {loading ? "Lagrer..." : "Del pris med community"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}