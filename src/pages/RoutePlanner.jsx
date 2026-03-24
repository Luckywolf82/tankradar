/**
 * RoutePlanner
 *
 * Enklest mulig ruteplanner:
 * - GPS som startpunkt
 * - Bruker fyller inn destinasjon (adresse / sted)
 * - Google Directions API henter polyline
 * - routeFuelRecommendation finner beste drivstoffstopp langs ruta
 * - Viser "Beste stopp langs ruta" med pris og estimert besparelse
 *
 * DATA: CurrentStationPrices (samme kilde som NearbyPrices)
 * ESTIMATE: merket "ca" — 40 liter, prisforskjell vs nærmeste stasjon
 */

import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation, MapPin, TrendingDown, Fuel, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { RouteAnimation } from "../components/mobile/RouteAnimation";
import { getFuelTypeLabel } from "@/utils/fuelTypeUtils";
import { findBestRouteStop, decodePolyline } from "@/utils/routeFuelRecommendation";

const FUEL_OPTIONS = [
  { value: "diesel", label: "Diesel" },
  { value: "gasoline_95", label: "Bensin 95" },
];

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

export default function RoutePlanner() {
  const [selectedFuel, setSelectedFuel] = useState("diesel");
  const [destination, setDestination] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [gpsState, setGpsState] = useState("pending"); // pending | ok | denied
  const [routeState, setRouteState] = useState("idle"); // idle | loading | ready | error | no_data
  const [result, setResult] = useState(null); // { bestStation, nearestStation, savingsEstimate }
  const [routeSummary, setRouteSummary] = useState(null); // { distanceText, durationText }
  const inputRef = useRef(null);

  // GPS acquisition
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsState("ok");
      },
      () => setGpsState("denied"),
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handleSearch = async () => {
    if (!destination.trim() || !userCoords) return;
    setRouteState("loading");
    setResult(null);

    try {
      // 1. Google Directions API — origin = GPS coords, destination = user text
      const origin = `${userCoords.lat},${userCoords.lon}`;
      const dest = encodeURIComponent(destination.trim());
      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&mode=driving&language=no&key=${GOOGLE_API_KEY}`;

      // Use a backend proxy to avoid CORS (we call our own function)
      const directionsRes = await base44.functions.invoke("fetchGoogleDirections", {
        origin,
        destination: destination.trim(),
      });

      const data = directionsRes.data;

      if (!data || data.status !== "OK" || !data.routes?.length) {
        setRouteState("error");
        return;
      }

      const route = data.routes[0];
      const leg = route.legs[0];
      const encodedPolyline = route.overview_polyline.points;
      const polyline = decodePolyline(encodedPolyline);

      setRouteSummary({
        distanceText: leg.distance?.text || null,
        durationText: leg.duration?.text || null,
      });

      // 2. Fetch CSP data
      const cspRows = await base44.entities.CurrentStationPrices.list();

      // 3. Find best stop
      const recommendation = findBestRouteStop(polyline, selectedFuel, cspRows, userCoords);

      if (!recommendation.bestStation) {
        setRouteState("no_data");
        return;
      }

      setResult(recommendation);
      setRouteState("ready");
    } catch (err) {
      console.error("[RoutePlanner] error:", err.message);
      setRouteState("error");
    }
  };

  const fuelLabel = getFuelTypeLabel(selectedFuel);

  return (
    <RouteAnimation pageName="RoutePlanner">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
        <div className="max-w-xl mx-auto space-y-4">

          {/* Back */}
          <Link
            to={createPageUrl("Dashboard")}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 text-sm"
          >
            <ArrowLeft size={15} /> Tilbake
          </Link>

          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Navigation size={20} className="text-blue-600" />
            Beste drivstoff langs ruta
          </h1>

          {/* Fuel selector */}
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
            {FUEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedFuel(opt.value)}
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                  selectedFuel === opt.value
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-3">

              {/* Start (GPS) */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-blue-600" />
                </div>
                <span>
                  {gpsState === "ok"
                    ? `Din posisjon (${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)})`
                    : gpsState === "denied"
                    ? "GPS ikke tilgjengelig"
                    : "Henter posisjon…"}
                </span>
              </div>

              {/* Destination input */}
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Skriv inn destinasjon (f.eks. Oslo sentrum)"
                  className="flex-1"
                  disabled={gpsState !== "ok"}
                />
                <Button
                  onClick={handleSearch}
                  disabled={gpsState !== "ok" || !destination.trim() || routeState === "loading"}
                  className="bg-blue-600 hover:bg-blue-700 shrink-0"
                >
                  {routeState === "loading" ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Søk"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Route summary */}
          {routeSummary && (
            <p className="text-xs text-slate-500 text-center">
              Rute: {routeSummary.distanceText} · ca {routeSummary.durationText}
            </p>
          )}

          {/* Result */}
          {routeState === "ready" && result && (
            <Card className="shadow-sm border-green-100 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-green-700 flex items-center gap-2">
                  <Fuel size={15} />
                  Beste stopp langs ruta · {fuelLabel}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">

                {/* Best station */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingDown size={14} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-0.5">Billigste langs ruta</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {result.bestStation.stationName}
                    </p>
                    {result.bestStation.stationChain && (
                      <p className="text-xs text-slate-400">{result.bestStation.stationChain}</p>
                    )}
                    <p className="text-lg font-bold text-green-700 mt-0.5">
                      {result.bestStation._price.toFixed(2)}{" "}
                      <span className="text-xs font-normal text-slate-500">kr/l</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ca {result.bestStation._distToRoute.toFixed(1)} km fra ruten
                    </p>
                  </div>

                  {/* Google Maps link */}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${result.bestStation.latitude},${result.bestStation.longitude}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="shrink-0 text-xs">
                      <Navigation size={12} className="mr-1" />
                      Naviger
                    </Button>
                  </a>
                </div>

                {/* Savings */}
                {result.savingsEstimate != null && result.savingsEstimate > 0 && (
                  <div className="border-t border-green-100 pt-3 flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">vs nærmeste stasjon langs ruta</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {result.nearestStation.stationName}
                        <span className="text-slate-400 font-normal ml-1">
                          — {result.nearestStation._price.toFixed(2)} kr/l
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Du sparer ca</p>
                      <p className="text-base font-bold text-green-700">
                        {result.savingsEstimate} kr
                      </p>
                      <p className="text-xs text-slate-400">per 40 l (estimert)</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* No data along route */}
          {routeState === "no_data" && (
            <Card className="shadow-sm border-amber-100 bg-amber-50">
              <CardContent className="p-4 text-sm text-amber-700">
                Ingen stasjoner med kjent {fuelLabel}-pris funnet langs denne ruten (innen 2 km fra ruten).
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {routeState === "error" && (
            <Card className="shadow-sm border-red-100 bg-red-50">
              <CardContent className="p-4 text-sm text-red-700">
                Kunne ikke beregne rute. Sjekk at destinasjonen er gyldig.
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </RouteAnimation>
  );
}