import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

export default function AdminReviewWorkbench() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.FuelPrice.filter({ station_match_status: "review_needed_station_match" }, "-created_date", 200)
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const newLast24h = items.filter(i => new Date(i.created_date) >= oneDayAgo).length;
  const oldest = items.length ? items[items.length - 1] : null;

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-amber-50">
              <ClipboardList size={16} className="text-amber-600" />
            </div>
            Review Queue — Sammendrag
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-400">Laster review-data...</p>
          ) : items.length === 0 ? (
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
            «Løst siste 7 dager» krever historisk status-logg som ikke finnes ennå.
          </p>
        </CardContent>
      </Card>

      {/* Links to operational review pages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[
          { label: "Review Queue", page: "ReviewQueue", desc: "Manuell stasjonsmatching for brukerrapporter" },
          { label: "Station Candidate Review", page: "StationCandidateReview", desc: "Godkjenn nye stasjonskandidater" },
          { label: "User Reported Scan Ops", page: "UserReportedScanOperations", desc: "Scan/OCR-operasjoner og historikk" },
          { label: "User Reported System Integration", page: "UserReportedSystemIntegrationReport", desc: "Systemintegrasjonsrapport" },
        ].map(({ label, page, desc }) => (
          <Link
            key={page}
            to={createPageUrl(page)}
            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <div>
              <p className="font-medium text-slate-800 text-sm">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
            <ExternalLink size={14} className="text-slate-400 shrink-0 ml-2" />
          </Link>
        ))}
      </div>
    </div>
  );
}