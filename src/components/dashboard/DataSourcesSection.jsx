import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertCircle, Loader } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

export default function DataSourcesSection() {
  const [fetchLogs, setFetchLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFetchLogs();
  }, []);

  const loadFetchLogs = async () => {
    setLoading(true);
    try {
      const logs = await base44.entities.FetchLog.list("-startedAt", 50);
      // Group by sourceName and get latest
      const latestBySource = {};
      logs.forEach(log => {
        if (!latestBySource[log.sourceName] || new Date(log.startedAt) > new Date(latestBySource[log.sourceName].startedAt)) {
          latestBySource[log.sourceName] = log;
        }
      });
      setFetchLogs(Object.values(latestBySource).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)));
    } catch (err) {
      console.error("Failed to load fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Datakilder og status</CardTitle>
        </CardHeader>
        <CardContent className="py-8 flex items-center justify-center gap-2 text-slate-400">
          <Loader size={16} className="animate-spin" /> Laster status...
        </CardContent>
      </Card>
    );
  }

  if (fetchLogs.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Datakilder og status</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-400 text-center py-6">
          Ingen hentinger registrert ennå.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Datakilder og status</CardTitle>
        <p className="text-xs text-slate-400 mt-1">Siste kjøring per kilde</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {fetchLogs.map(log => (
            <div key={log.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {log.success ? (
                    <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-slate-800">{log.sourceName}</p>
                    <p className="text-xs text-slate-500">
                      {format(parseISO(log.startedAt), "d. MMM HH:mm", { locale: nb })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-700">
                    {log.recordsCreated} opprettet • {log.recordsSkipped} hoppet over
                  </div>
                  <div className={`text-xs font-medium mt-1 ${log.success ? "text-green-600" : "text-red-600"}`}>
                    {log.success ? "OK" : "Feil"}
                  </div>
                </div>
              </div>
              {log.errorMessage && (
                <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">
                  {log.errorMessage}
                </p>
              )}
              {log.notes && (
                <p className="text-xs text-slate-600 mt-2">
                  {log.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}