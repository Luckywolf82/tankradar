import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Fuel, CheckCircle, XCircle } from "lucide-react";

export default function ReviewQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.FuelPrice
      .filter({ station_match_status: "review_needed_station_match" }, "-created_date", 50)
      .then(data => {
        setItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("[ReviewQueue] fetch review_needed", err.message);
        setLoading(false);
      });
  }, []);

  const handleMatch = async (item, stationId) => {
    await base44.entities.FuelPrice.update(item.id, {
      stationId,
      station_match_status: "matched_station_id",
      station_match_notes: "Manuelt godkjent av kurator",
    });
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const handleReject = async (item) => {
    await base44.entities.FuelPrice.update(item.id, {
      station_match_status: "no_safe_station_match",
      station_match_notes: "Avvist av kurator",
    });
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Review Queue</h1>
        <p className="text-slate-600">Brukerrapporterte priser som trenger manuell stasjonsmatching</p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Ingen elementer i kø</p>
            <p className="text-slate-400 text-sm mt-1">Alle brukerrapporter er behandlet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Fuel size={16} className="text-green-600" />
                    {item.station_name || "Ukjent stasjon"}
                  </CardTitle>
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                    Review needed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex gap-4 flex-wrap">
                  <span className="text-slate-500">Kjede: <strong className="text-slate-700">{item.station_chain || "–"}</strong></span>
                  <span className="text-slate-500">Type: <strong className="text-slate-700">{item.fuelType}</strong></span>
                  <span className="text-slate-500">Pris: <strong className="text-slate-700">{item.priceNok} NOK</strong></span>
                </div>
                {item.gps_latitude && (
                  <div className="flex items-center gap-1 text-slate-500">
                    <MapPin size={13} />
                    <span>{item.gps_latitude?.toFixed(4)}, {item.gps_longitude?.toFixed(4)}</span>
                  </div>
                )}
                {item.station_match_candidates?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-slate-500 mb-1 text-xs">Kandidater:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.station_match_candidates.map(cId => (
                        <Button
                          key={cId}
                          size="sm"
                          variant="outline"
                          className="text-xs border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => handleMatch(item, cId)}
                        >
                          <CheckCircle size={12} className="mr-1" />
                          Match: {cId}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleReject(item)}
                  >
                    <XCircle size={14} className="mr-1" />
                    Avvis
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}