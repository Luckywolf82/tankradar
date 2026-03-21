import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Users, TrendingDown } from "lucide-react";
import StreakCounter from "./StreakCounter";

// Rough estimation constants — accuracy not critical, directionally motivating
const AVG_DRIVERS_PER_REPORT = 285;   // avg daily drivers who might see/benefit from a price observation
const AVG_SAVINGS_PER_REPORT = 21.5;  // estimated NOK saved across those drivers (avg tank diff × share)

export default function ContributionImpactCard() {
  const [reportCount, setReportCount] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user?.email) { setLoading(false); return; }

      const fetchedReports = await base44.entities.FuelPrice.filter(
        { sourceName: "user_reported", reportedByUserId: user.email },
        "-fetchedAt",
        50
      );
      setReports(fetchedReports);
      setReportCount(fetchedReports.length);
      setLoading(false);
    };
    load();
  }, []);

  if (loading || reportCount === null) return null;
  if (reportCount === 0) return null;

  const driversHelped = Math.round(reportCount * AVG_DRIVERS_PER_REPORT);
  const estimatedSaved = Math.round(reportCount * AVG_SAVINGS_PER_REPORT);

  return (
    <Card className="shadow-sm border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 mb-5">
      <CardContent className="py-4 px-4">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">Dine bidrag</p>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="flex justify-center mb-1">
              <Zap size={15} className="text-green-600" />
            </div>
            <p className="text-xl font-bold text-slate-800">{reportCount}</p>
            <p className="text-xs text-slate-500">Priser rapportert</p>
          </div>
          <div className="text-center border-x border-green-100">
            <div className="flex justify-center mb-1">
              <Users size={15} className="text-green-600" />
            </div>
            <p className="text-xl font-bold text-slate-800">{driversHelped.toLocaleString("nb-NO")}</p>
            <p className="text-xs text-slate-500">Sjåfører hjulpet</p>
          </div>
          <div className="text-center border-r border-green-100">
            <div className="flex justify-center mb-1">
              <TrendingDown size={15} className="text-green-600" />
            </div>
            <p className="text-xl font-bold text-slate-800">{estimatedSaved.toLocaleString("nb-NO")}</p>
            <p className="text-xs text-slate-500">Estimert spart (kr)</p>
          </div>
          <StreakCounter reportCount={reportCount} reports={reports} />
        </div>
        <p className="text-xs text-slate-400 mt-3 text-center">Estimert basert på dine innsendte priser</p>
      </CardContent>
    </Card>
  );
}