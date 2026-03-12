import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

export default function ReviewQueueSummary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.FuelPrice.filter({ station_match_status: "review_needed_station_match" }, "-created_date", 200)
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Card className="mb-4">
      <CardContent className="pt-4 text-sm text-slate-400">Laster review-data...</CardContent>
    </Card>
  );

  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const newLast24h = items.filter(i => new Date(i.created_date) >= oneDayAgo).length;
  const oldest = items.length ? items[items.length - 1] : null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-amber-50">
            <ClipboardList size={16} className="text-amber-600" />
          </div>
          Review-kø
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-500 mb-3">
          Saker her må avklares manuelt fordi matchingmotoren ikke hadde høy nok sikkerhet til å koble dem automatisk.
        </p>

        {items.length === 0 ? (
          <p className="text-sm text-slate-400">Ingen saker venter på review.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{items.length}</p>
              <p className="text-xs text-amber-600 mt-0.5">Totalt til review</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{newLast24h}</p>
              <p className="text-xs text-blue-600 mt-0.5">Nye siste 24 timer</p>
            </div>
            {oldest && (
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {formatDistanceToNow(new Date(oldest.created_date), { addSuffix: true, locale: nb })}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Eldste ubehandlede</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded p-3">
          <p className="text-xs font-semibold text-slate-700 mb-2">Arbeidsflyt for review</p>
          <ol className="space-y-1 text-xs text-slate-600 list-decimal list-inside">
            <li>Åpne review-kø</li>
            <li>Kontroller navn, kjede og sted for saken</li>
            <li>Vurder om saken kan kobles trygt til en stasjon</li>
            <li>Dokumenter hvorfor den godkjennes eller må stå videre</li>
          </ol>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Merk: «Løst siste 7 dager» krever en historisk status-logg som ikke finnes ennå.
        </p>
      </CardContent>
    </Card>
  );
}