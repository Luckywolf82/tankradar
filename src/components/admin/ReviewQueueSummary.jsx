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
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const newLast24h = items.filter(i => new Date(i.created_date) >= oneDayAgo).length;
  const oldest = items.length ? items[items.length - 1] : null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-amber-50">
            <ClipboardList size={16} className="text-amber-600" />
          </div>
          Review Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">Ingen venter på review.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{items.length}</p>
              <p className="text-xs text-amber-600 mt-0.5">Totalt review_needed</p>
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
                <p className="text-xs text-slate-500 mt-0.5">Eldste urevidert</p>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3">
          Merk: «Løst siste 7 dager» krever en historisk status-logg som ikke finnes ennå.
        </p>
      </CardContent>
    </Card>
  );
}