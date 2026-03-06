import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

const fuelTypeLabel = {
  gasoline_95: "Bensin 95",
  gasoline_98: "Bensin 98",
  diesel: "Diesel",
};

const chainColors = {
  "Circle K": "bg-red-100 text-red-700",
  "Uno-X": "bg-orange-100 text-orange-700",
  "Esso": "bg-blue-100 text-blue-700",
  "Shell": "bg-yellow-100 text-yellow-700",
  "YX": "bg-purple-100 text-purple-700",
  "Best": "bg-green-100 text-green-700",
  "Annet": "bg-slate-100 text-slate-700",
};

export default function RecentPrices({ prices, loading }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Siste registreringer fra community</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : prices.length === 0 ? (
          <p className="text-slate-400 text-center py-6">Ingen station-priser registrert ennå.</p>
        ) : (
          <div className="space-y-2">
            {prices.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${chainColors[p.chain] || chainColors["Annet"]}`}>
                    {p.chain || "Annet"}
                  </span>
                  <span className="text-slate-700 text-sm">{p.city || "–"}{p.stationName ? ` – ${p.stationName}` : ""}</span>
                  <span className="text-xs text-slate-400">{fuelTypeLabel[p.fuelType]}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800">{p.priceNok.toFixed(2)} kr</span>
                  <p className="text-xs text-slate-400">{p.fetchedAt ? format(parseISO(p.fetchedAt.split("T")[0]), "d. MMM", { locale: nb }) : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}