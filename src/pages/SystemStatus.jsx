import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, GitMerge, Activity } from "lucide-react";

function StatRow({ label, value, sub }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div>
        <span className="text-sm text-slate-700">{label}</span>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
      <span className="font-semibold text-slate-900 tabular-nums">
        {value === null ? "–" : value}
      </span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, color, bg, children }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className={`p-1.5 rounded-lg ${bg}`}>
            <Icon size={16} className={color} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function SystemStatus() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [stations, userReported, googlePrices, allPrices] = await Promise.all([
          base44.entities.Station.list("-created_date", 1),
          base44.entities.FuelPrice.filter({ priceType: "user_reported" }, "-created_date", 1),
          base44.entities.FuelPrice.filter({ sourceName: "GooglePlaces" }, "-created_date", 1),
          base44.entities.FuelPrice.list("-created_date", 1),
        ]);

        // Detailed counts via filter
        const [matched, reviewNeeded, noSafeMatch, realistic, suspect] = await Promise.all([
          base44.entities.FuelPrice.filter({ station_match_status: "matched_station_id" }, "-created_date", 1),
          base44.entities.FuelPrice.filter({ station_match_status: "review_needed_station_match" }, "-created_date", 1),
          base44.entities.FuelPrice.filter({ station_match_status: "no_safe_station_match" }, "-created_date", 1),
          base44.entities.FuelPrice.filter({ plausibilityStatus: "realistic_price" }, "-created_date", 1),
          base44.entities.FuelPrice.filter({ plausibilityStatus: "suspect_price_low" }, "-created_date", 1),
        ]);

        // These return arrays — we need actual counts
        // Re-fetch with high limit to count
        const [
          stationsAll, userReportedAll, googleAll, allPricesAll,
          matchedAll, reviewAll, noSafeAll, realisticAll, suspectLowAll
        ] = await Promise.all([
          base44.entities.Station.list("-created_date", 5000),
          base44.entities.FuelPrice.filter({ priceType: "user_reported" }, "-created_date", 5000),
          base44.entities.FuelPrice.filter({ sourceName: "GooglePlaces" }, "-created_date", 5000),
          base44.entities.FuelPrice.list("-created_date", 5000),
          base44.entities.FuelPrice.filter({ station_match_status: "matched_station_id" }, "-created_date", 5000),
          base44.entities.FuelPrice.filter({ station_match_status: "review_needed_station_match" }, "-created_date", 5000),
          base44.entities.FuelPrice.filter({ station_match_status: "no_safe_station_match" }, "-created_date", 5000),
          base44.entities.FuelPrice.filter({ plausibilityStatus: "realistic_price" }, "-created_date", 5000),
          base44.entities.FuelPrice.filter({ plausibilityStatus: "suspect_price_low" }, "-created_date", 5000),
        ]);

        const suspectHighAll = await base44.entities.FuelPrice.filter({ plausibilityStatus: "suspect_price_high" }, "-created_date", 5000);

        setStats({
          stations: stationsAll.length,
          userReported: userReportedAll.length,
          matched: matchedAll.length,
          reviewNeeded: reviewAll.length,
          noSafeMatch: noSafeAll.length,
          googlePrices: googleAll.length,
          totalPrices: allPricesAll.length,
          realistic: realisticAll.length,
          suspectLow: suspectLowAll.length,
          suspectHigh: suspectHighAll.length,
        });
      } catch (err) {
        console.error("[SystemStatus] load", err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <p className="text-slate-500 text-sm">Kunne ikke laste systemstatus.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Systemstatus</h1>
        <p className="text-slate-600 text-sm">Nøkkeltall for data, matching og systemhelse</p>
      </div>

      <SectionCard title="Data" icon={Database} color="text-blue-600" bg="bg-blue-50">
        <StatRow label="Stasjoner totalt" value={stats.stations} />
        <StatRow label="Brukerrapporterte priser" value={stats.userReported} sub="priceType: user_reported" />
        <StatRow label="Matched (station_match_status)" value={stats.matched} sub="matched_station_id" />
        <StatRow label="Review needed" value={stats.reviewNeeded} sub="review_needed_station_match" />
        <StatRow label="No safe match" value={stats.noSafeMatch} sub="no_safe_station_match" />
      </SectionCard>

      <SectionCard title="Matching" icon={GitMerge} color="text-amber-600" bg="bg-amber-50">
        <StatRow label="Items i review queue" value={stats.reviewNeeded} sub="Venter på manuell behandling" />
      </SectionCard>

      <SectionCard title="System" icon={Activity} color="text-green-600" bg="bg-green-50">
        <StatRow label="GooglePlaces priser" value={stats.googlePrices} sub="sourceName: GooglePlaces" />
        <StatRow label="Totalt antall prisposter" value={stats.totalPrices} />
        <StatRow label="Realistiske priser" value={stats.realistic} sub="plausibilityStatus: realistic_price" />
        <StatRow label="Filtrert – lav pris" value={stats.suspectLow} sub="suspect_price_low" />
        <StatRow label="Filtrert – høy pris" value={stats.suspectHigh} sub="suspect_price_high" />
      </SectionCard>
    </div>
  );
}