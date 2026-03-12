import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

const SOURCES = ["GooglePlaces", "FuelFinder", "GlobalPetrolPrices", "user_reported"];

export default function DataSourceStatus() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.FetchLog.list("-startedAt", 200)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  const getSourceData = (sourceName) => {
    const sourceLogs = logs.filter(l => l.sourceName === sourceName);
    if (!sourceLogs.length) return null;
    const latest = sourceLogs[0];
    const lastSuccess = sourceLogs.find(l => l.success);
    const lastFailure = sourceLogs.find(l => !l.success);
    return { latest, lastSuccess, lastFailure };
  };

  if (loading) return (
    <Card className="mb-4">
      <CardContent className="pt-4 text-sm text-slate-400">Laster kildedata...</CardContent>
    </Card>
  );

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-green-50">
            <Activity size={16} className="text-green-700" />
          </div>
          Datakildestatus
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-500 mb-3">
          Siste hentestatus per datakilde. Grønt betyr siste kjøring var vellykket. Rødt betyr siste kjøring feilet.
        </p>
        <div className="divide-y divide-slate-100">
          {SOURCES.map(source => {
            const data = getSourceData(source);
            if (!data) return (
              <div key={source} className="py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{source}</span>
                <span className="text-xs text-slate-400">Ingen logg funnet</span>
              </div>
            );
            const { latest } = data;
            const isOk = latest?.success;
            return (
              <div key={source} className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {isOk
                      ? <CheckCircle size={14} className="text-green-500" />
                      : <XCircle size={14} className="text-red-500" />}
                    <span className="text-sm font-medium text-slate-800">{source}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {isOk ? "OK" : "FEIL"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-slate-500 pl-5">
                  <span>
                    <Clock size={10} className="inline mr-1" />
                    {latest.startedAt
                      ? formatDistanceToNow(new Date(latest.startedAt), { addSuffix: true, locale: nb })
                      : "–"}
                  </span>
                  <span>Opprettet: <strong className="text-slate-700">{latest.recordsCreated ?? "–"}</strong></span>
                  <span>Hoppet over: <strong className="text-slate-700">{latest.recordsSkipped ?? "–"}</strong></span>
                  {!isOk && latest.errorMessage && (
                    <span className="col-span-2 sm:col-span-4 text-red-500 truncate">
                      Feil: {latest.errorMessage}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-3 border-t pt-3">
          Hva betyr dette? Denne statusen leses fra FetchLog. Kilde-sannhetskilden er SourceRegistry.
        </p>
      </CardContent>
    </Card>
  );
}