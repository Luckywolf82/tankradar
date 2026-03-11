import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, MapPin } from "lucide-react";

const CHAINS = ["Circle K", "Uno-X", "Esso", "Shell", "YX", "Best", "Annet"];

// Trigger condition: second candidate exists AND gap is small (< 300m = real ambiguity)
export function shouldShowProximityBanner(stationInfo) {
  if (stationInfo.userConfirmedSuggestedStation !== null) return false; // already answered
  if (stationInfo.secondCandidateDistanceM == null) return false;
  if (stationInfo.distanceGapM == null) return false;
  return stationInfo.distanceGapM < 300;
}

export default function ProximityConfirmBanner({ stationInfo, setStationInfo, onChangeStation }) {
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctedChain, setCorrectedChain] = useState("");

  if (!shouldShowProximityBanner(stationInfo)) return null;

  const distM = stationInfo.selectedCandidateDistanceM;
  const secondDistM = stationInfo.secondCandidateDistanceM;
  const gapM = stationInfo.distanceGapM;

  const handleJa = () => {
    setStationInfo(prev => ({ ...prev, userConfirmedSuggestedStation: true }));
  };

  const handleNei = () => {
    setShowCorrection(true);
  };

  const handleChainCorrection = () => {
    setStationInfo(prev => ({
      ...prev,
      userConfirmedSuggestedStation: false,
      userCorrectedChain: correctedChain || null,
      userClarificationReason: "user_corrected_chain",
    }));
    setShowCorrection(false);
  };

  const handleChangeStation = () => {
    setStationInfo(prev => ({
      ...prev,
      userConfirmedSuggestedStation: false,
      userClarificationReason: "user_changed_station",
    }));
    onChangeStation();
  };

  // Already confirmed → show quiet confirmation badge
  if (stationInfo.userConfirmedSuggestedStation === true) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4 text-sm text-green-700">
        <CheckCircle size={15} className="flex-shrink-0" />
        <span>Stasjon bekreftet: <strong>{stationInfo.station_name}</strong></span>
      </div>
    );
  }

  // Already corrected chain → show quiet note
  if (stationInfo.userConfirmedSuggestedStation === false && stationInfo.userCorrectedChain) {
    return (
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-sm text-amber-700">
        <AlertTriangle size={15} className="flex-shrink-0" />
        <span>Kjede korrigert til <strong>{stationInfo.userCorrectedChain}</strong></span>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 mb-1">Er dette riktig stasjon?</p>
          <p className="text-sm font-medium text-slate-900 truncate">{stationInfo.station_name}</p>
          {stationInfo.station_chain && (
            <p className="text-xs text-slate-500">{stationInfo.station_chain}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {distM != null ? `${distM} m unna` : "Avstand ukjent"}
            </span>
            {secondDistM != null && (
              <span className="text-amber-600">
                Nærmeste alternativ: {secondDistM} m ({gapM} m gap)
              </span>
            )}
          </div>
        </div>
      </div>

      {!showCorrection ? (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-green-600 hover:bg-green-700 flex-1"
            onClick={handleJa}
          >
            Ja, riktig stasjon
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={handleNei}
          >
            Nei
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 font-medium">Korriger kjede (valgfritt):</p>
          <Select value={correctedChain} onValueChange={setCorrectedChain}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Velg riktig kjede..." />
            </SelectTrigger>
            <SelectContent>
              {CHAINS.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 flex-1 text-xs"
              onClick={handleChainCorrection}
            >
              Bekreft korrigering
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={handleChangeStation}
            >
              Velg annen stasjon
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}