import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fuel, MapPin, ChevronRight, TrendingDown, Flame, AlertCircle, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PUMP_RADIUS_KM = 0.15; // 150m — "at pump" threshold

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distLabel(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/**
 * Renders the certainty-aware insight line above the CTA.
 *
 * pumpInsight = { type: string, text: string }
 *
 * Supported types:
 *   "among_cheapest"               → green, fire icon
 *   "cheaper_alternative_exists"   → amber, savings icon
 *   "missing_station_price"        → slate, help icon — logging prompt
 *   "insufficient_fresh_nearby_data" → slate, help icon — logging prompt
 */
function PumpInsightLine({ insight }) {
  if (!insight) return null;

  const config = {
    among_cheapest: {
      icon: <Flame size={12} className="shrink-0 text-green-600" />,
      className: "bg-green-50 border border-green-100 text-green-800",
    },
    cheaper_alternative_exists: {
      icon: <TrendingDown size={12} className="shrink-0 text-amber-600" />,
      className: "bg-amber-50 border border-amber-100 text-amber-800",
    },
    missing_station_price: {
      icon: <HelpCircle size={12} className="shrink-0 text-slate-400" />,
      className: "bg-slate-50 border border-slate-200 text-slate-600",
    },
    insufficient_fresh_nearby_data: {
      icon: <HelpCircle size={12} className="shrink-0 text-slate-400" />,
      className: "bg-slate-50 border border-slate-200 text-slate-600",
    },
  };

  const { icon, className } = config[insight.type] ?? {
    icon: <AlertCircle size={12} className="shrink-0 text-slate-400" />,
    className: "bg-slate-50 border border-slate-200 text-slate-600",
  };

  return (
    <div className={`flex items-start gap-1.5 text-xs rounded-lg px-2.5 py-1.5 mb-3 ${className}`}>
      {icon}
      <span>{insight.text}</span>
    </div>
  );
}

/**
 * Returns case-specific CTA text and support text based on pumpInsight.type.
 *
 * Certainty rules:
 * - High certainty (among_cheapest, cheaper_alternative_exists) → lead with insight, minimal support
 * - Low certainty (missing/stale/insufficient) → honest "helps YOU compare now" framing
 * - No insight yet → neutral fallback
 */
function resolveCopy(insightType) {
  switch (insightType) {
    case "missing_station_price":
      return {
        headline: "Ingen oppdatert pris på denne stasjonen akkurat nå",
        support: "Registrer prisen her for å få en mer treffsikker sammenligning med en gang.",
        cta: "Registrer pris nå",
      };
    case "stale_station_price":
      return {
        headline: "Prisen her kan være utdatert",
        support: "Oppdater prisen for å se et mer nøyaktig sammenligningsgrunnlag.",
        cta: "Oppdater pris nå",
      };
    case "cheaper_alternative_exists":
      return {
        headline: null, // insight.text already shown via PumpInsightLine
        support: "Oppdater prisen her hvis du vil gjøre sammenligningen enda mer presis.",
        cta: "Registrer pris her nå",
      };
    case "among_cheapest":
      return {
        headline: null, // insight.text already shown via PumpInsightLine
        support: "Hold prisene rundt deg oppdatert.",
        cta: "Registrer pris her nå",
      };
    case "insufficient_fresh_nearby_data":
      return {
        headline: "Vi har for få ferske priser i området akkurat nå",
        support: "Registrer prisen her for å gjøre prisbildet rundt deg bedre.",
        cta: "Registrer pris nå",
      };
    default:
      return {
        headline: null,
        support: "Registrer prisen her – så blir sammenligningen rundt deg mer treffsikker.",
        cta: "Registrer pris her nå",
      };
  }
}

/**
 * PumpModeCard — shown when user is within 150m of a known station.
 *
 * Props:
 *   onActivate(bool)       — called when pump mode is activated or hidden
 *   onStationDetected(id)  — called with the detected stationId, used by
 *                            parent to derive pumpInsight via usePumpInsight
 *   pumpInsight            — { type, text } — certainty-aware insight derived
 *                            in parent from CurrentStationPrices context
 *                            (optional — card works without it)
 */
export default function PumpModeCard({
  onActivate,
  onStationDetected,
  pumpInsight,
}) {
  const [station, setStation] = useState(null);
  const [distKm, setDistKm] = useState(null);
  const [step, setStep] = useState("idle");

  // GPS + station detection — unchanged
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        const stations = await base44.entities.Station.list("-created_date", 2000);
        const nearby = stations
          .filter((s) => s.latitude && s.longitude && s.status !== "archived_duplicate")
          .map((s) => ({
            ...s,
            _distKm: haversineKm(latitude, longitude, s.latitude, s.longitude),
          }))
          .filter((s) => s._distKm <= PUMP_RADIUS_KM)
          .sort((a, b) => a._distKm - b._distKm);

        if (nearby.length === 0) {
          setStep("hidden");
          onActivate?.(false);
          return;
        }

        const nearest = nearby[0];
        setStation(nearest);
        onActivate?.(true);
        onStationDetected?.(nearest.id);
        setDistKm(nearest._distKm);
      },
      () => { setStep("hidden"); onActivate?.(false); },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  if (step === "hidden") return null;
  if (!station) return null;

  return (
    <Card className="shadow-md border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 mb-5">
      <CardContent className="py-4 px-4">
        {/* Header — station identity */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <Fuel size={15} className="text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{station.name}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin size={10} />
              {distLabel(distKm)}
              {station.chain && (
                <span className="text-slate-400">· {station.chain}</span>
              )}
            </p>
          </div>
          <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full shrink-0">
            Pumpe i nærheten
          </span>
        </div>

        {/* Certainty-aware insight badge — only for high-certainty cases */}
        <PumpInsightLine insight={pumpInsight} />

        {/* Case-specific headline — shown for low-certainty cases where insight.text is not shown */}
        {(() => {
          const copy = resolveCopy(pumpInsight?.type);
          return copy.headline ? (
            <p className="text-xs font-medium text-slate-700 leading-snug mb-1.5 px-1">
              {copy.headline}
            </p>
          ) : null;
        })()}

        {/* Support text — always shown, varies by case */}
        <p className="text-xs text-slate-500 leading-relaxed mb-3 px-1">
          {resolveCopy(pumpInsight?.type).support}
        </p>

        {/* Primary CTA — text varies by certainty case */}
        <Link to={createPageUrl("LogPrice")}>
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-2 text-sm">
            {resolveCopy(pumpInsight?.type).cta}
            <ChevronRight size={15} />
          </Button>
        </Link>

        {/* Subtext — low friction */}
        <p className="text-center text-xs text-slate-400 mt-2">
          Ta bilde av prisskiltet — tar under 10 sekunder
        </p>
      </CardContent>
    </Card>
  );
}