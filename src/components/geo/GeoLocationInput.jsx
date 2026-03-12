import React, { useState } from "react";
import { MapPin, Crosshair, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GeoContextLinks from "./GeoContextLinks";

export default function GeoLocationInput({
  value = {},
  onChange,
  title = "Lokasjon",
  allowCurrentLocation = true,
  allowManual = true,
  allowAddressSearch = true,
}) {
  const [geoStatus, setGeoStatus] = useState(null); // null | "loading" | "ok" | "error"
  const [geoError, setGeoError] = useState("");
  const [addressLabel, setAddressLabel] = useState(value.addressLabel || "");

  const lat = value.latitude ?? "";
  const lng = value.longitude ?? "";
  const hasCoords =
    lat !== "" && lng !== "" && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      setGeoError("Geolokasjon støttes ikke av denne nettleseren.");
      return;
    }
    setGeoStatus("loading");
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus("ok");
        onChange({
          ...value,
          latitude: parseFloat(pos.coords.latitude.toFixed(5)),
          longitude: parseFloat(pos.coords.longitude.toFixed(5)),
          addressLabel,
        });
      },
      (err) => {
        setGeoStatus("error");
        setGeoError(
          err.code === 1
            ? "Tilgang til posisjon ble avslått."
            : "Kunne ikke hente posisjon. Prøv manuelt."
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleLatChange = (e) => {
    const v = e.target.value;
    onChange({ ...value, latitude: v === "" ? "" : parseFloat(v), addressLabel });
  };
  const handleLngChange = (e) => {
    const v = e.target.value;
    onChange({ ...value, longitude: v === "" ? "" : parseFloat(v), addressLabel });
  };
  const handleAddressChange = (e) => {
    setAddressLabel(e.target.value);
    onChange({ ...value, addressLabel: e.target.value });
  };

  return (
    <div className="space-y-3">
      {title && (
        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <MapPin size={12} className="text-slate-500" />
          {title}
        </p>
      )}

      {/* Current location */}
      {allowCurrentLocation && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCurrentLocation}
            disabled={geoStatus === "loading"}
            className="text-xs"
          >
            {geoStatus === "loading" ? (
              <><Loader2 size={12} className="mr-1.5 animate-spin" />Henter posisjon…</>
            ) : (
              <><Crosshair size={12} className="mr-1.5" />Bruk min posisjon</>
            )}
          </Button>
          {geoStatus === "ok" && (
            <span className="text-[11px] text-green-700 font-medium">✓ Posisjon hentet</span>
          )}
          {geoStatus === "error" && (
            <span className="text-[11px] text-red-600">{geoError}</span>
          )}
        </div>
      )}

      {/* Address search (UI only, no geocoding) */}
      {allowAddressSearch && (
        <div>
          <label className="text-[11px] text-slate-500 block mb-1">Adresse eller sted (valgfritt)</label>
          <input
            type="text"
            value={addressLabel}
            onChange={handleAddressChange}
            placeholder="f.eks. Moholt, Trondheim"
            className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <p className="text-[10px] text-slate-400 mt-0.5">Lagres som stedsnavn. Koordinater må angis manuelt eller via «Bruk min posisjon».</p>
        </div>
      )}

      {/* Manual coordinates */}
      {allowManual && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Breddegrad</label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={handleLatChange}
              placeholder="63.4305"
              className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Lengdegrad</label>
            <input
              type="number"
              step="0.0001"
              value={lng}
              onChange={handleLngChange}
              placeholder="10.3951"
              className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>
      )}

      {/* Preview when coords exist */}
      {hasCoords && (
        <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-600">
          <span className="font-mono">{parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}</span>
          {addressLabel && <span className="ml-2 text-slate-500">— {addressLabel}</span>}
          <GeoContextLinks latitude={lat} longitude={lng} label="Verifiser på kart:" />
        </div>
      )}
    </div>
  );
}