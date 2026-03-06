import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import PhotoCapture from "../components/logprice/PhotoCapture.jsx";
import ConfirmPrice from "../components/logprice/ConfirmPrice.jsx";

const FUEL_TYPES = ["bensin_95", "bensin_98", "diesel", "diesel_premium"];

function emptyPrices() {
  return Object.fromEntries(FUEL_TYPES.map(k => [k, { price: "", enabled: false, aiDetected: false }]));
}

function classifyPricePlausibility(priceNok) {
  if (!priceNok) return null;
  if (priceNok < 10) return "suspect_price_low";
  if (priceNok > 30) return "suspect_price_high";
  return "realistic_price";
}

function latLonToRegion(lat, lon) {
  if (lat > 70) return "Finnmark";
  if (lat > 69) return "Troms";
  if (lat > 65) return "Nordland";
  if (lat > 63) return "Trøndelag";
  if (lat > 62) return "Møre og Romsdal";
  if (lat > 60.5) return "Vestland";
  if (lon < 6.5 && lat > 58.5) return "Rogaland";
  if (lat > 58.5) return "Agder";
  if (lat > 59.3 && lon > 10) return "Oslo og Akershus";
  if (lat > 59.3) return "Viken";
  if (lat > 58.8) return "Vestfold og Telemark";
  return "Innlandet";
}

function guessChain(name) {
  if (!name) return "";
  const n = name.toLowerCase();
  if (n.includes("circle k") || n.includes("statoil")) return "Circle K";
  if (n.includes("uno-x") || n.includes("unox")) return "Uno-X";
  if (n.includes("esso")) return "Esso";
  if (n.includes("shell")) return "Shell";
  if (n.includes("yx")) return "YX";
  if (n.includes("best")) return "Best";
  return "";
}

export default function LogPrice() {
  const [step, setStep] = useState("photo");
  const [imageUrl, setImageUrl] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detectedPrices, setDetectedPrices] = useState(emptyPrices());
  const [stationInfo, setStationInfo] = useState({
    station_chain: "",
    station_name: "",
    city: "",
    region: "",
    date_observed: format(new Date(), "yyyy-MM-dd"),
  });

  const handlePhoto = async (file) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setStep("confirm");
    setLocationLoading(true);

    // Store GPS for later matching
    let gpsCoords = null;
    
    // Run AI + GPS in parallel
    const [aiResult, gpsResult] = await Promise.allSettled([
      // AI: read all prices from image
      (async () => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return base44.integrations.Core.InvokeLLM({
          prompt: `Look at this image of a Norwegian gas station price sign. Extract ALL fuel prices visible. Return a JSON object with these optional fields: bensin_95 (number), bensin_98 (number), diesel (number), diesel_premium (number). Only include prices clearly visible. Norwegian fuel prices are between 15 and 25 kr per liter. If a price is not visible, omit that field.`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              bensin_95: { type: "number" },
              bensin_98: { type: "number" },
              diesel: { type: "number" },
              diesel_premium: { type: "number" },
            }
          }
        });
      })(),

      // GPS: get location
      (async () => {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        );
        const { latitude, longitude } = pos.coords;
        const region = latLonToRegion(latitude, longitude);

        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=16`,
          { headers: { "Accept-Language": "no" } }
        ).then(r => r.json());

        const city = geo?.address?.city || geo?.address?.town || geo?.address?.village || geo?.address?.suburb || "";

        // Find nearby fuel stations using overpass-style Nominatim search
        const poi = await fetch(
          `https://nominatim.openstreetmap.org/search?amenity=fuel&format=json&limit=1&bounded=1&viewbox=${longitude - 0.005},${latitude + 0.005},${longitude + 0.005},${latitude - 0.005}`,
          { headers: { "Accept-Language": "no" } }
        ).then(r => r.json());

        const stationName = poi?.[0]?.display_name || "";
        const chain = guessChain(stationName) || guessChain(poi?.[0]?.name || "");

        return { city, region, stationName: stationName.split(",")[0], chain };
      })()
    ]);

    // Apply AI results
    if (aiResult.status === "fulfilled") {
      const ai = aiResult.value;
      setDetectedPrices(prev => {
        const next = { ...prev };
        for (const key of FUEL_TYPES) {
          if (ai[key] && ai[key] > 10 && ai[key] < 30) {
            next[key] = { price: ai[key].toFixed(2), enabled: true, aiDetected: true };
          }
        }
        // If nothing detected, enable bensin_95 for manual entry
        if (!Object.values(next).some(v => v.enabled)) {
          next.bensin_95 = { price: "", enabled: true, aiDetected: false };
        }
        return next;
      });
    } else {
      // Enable bensin_95 for manual entry if AI failed
      setDetectedPrices(prev => ({ ...prev, bensin_95: { price: "", enabled: true, aiDetected: false } }));
    }

    // Apply GPS results
    if (gpsResult.status === "fulfilled") {
      const { city, region, stationName, chain, latitude, longitude } = gpsResult.value;
      gpsCoords = { latitude, longitude };
      window.__gpsLat = latitude;
      window.__gpsLon = longitude;
      setStationInfo(prev => ({
        ...prev,
        city: city || prev.city,
        region: region || prev.region,
        station_chain: chain || prev.station_chain,
        station_name: stationName || prev.station_name,
      }));
    }

    setLocationLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const today = stationInfo.date_observed;
    const now = new Date().toISOString();
    
    // Attempt station matching
    let matchResult = null;
    try {
      const matchRes = await base44.functions.invoke('matchStationForUserReportedPrice', {
        gps_lat: window.__gpsLat,
        gps_lon: window.__gpsLon,
        station_name: stationInfo.station_name,
        station_chain: stationInfo.station_chain,
        city: stationInfo.city
      });
      matchResult = matchRes.data;
    } catch (err) {
      // Matching error, continue without stationId
      matchResult = { status: 'no_safe_station_match', stationId: null };
    }
    
    const entries = FUEL_TYPES
      .filter(k => detectedPrices[k].enabled && detectedPrices[k].price)
      .map(k => {
        const priceNok = parseFloat(detectedPrices[k].price);
        const entry = {
          fuelType: k,
          priceNok: priceNok,
          priceType: "user_reported",
          sourceName: "user_reported",
          sourceUrl: null,
          sourceUpdatedAt: null,
          fetchedAt: now,
          sourceFrequency: "unknown",
          confidenceScore: 1.0,
          parserVersion: "user_reported_v1",
          plausibilityStatus: classifyPricePlausibility(priceNok),
          locationLabel: stationInfo.city || null,
          rawPayloadSnippet: `User reported: ${k} = ${priceNok} NOK/L`,
          station_match_status: matchResult?.status || 'no_safe_station_match'
        };
        
        // Add stationId if matched
        if (matchResult?.status === 'matched_station_id' && matchResult?.stationId) {
          entry.stationId = matchResult.stationId;
        }
        
        // Add candidates if review needed
        if (matchResult?.status === 'review_needed_station_match' && matchResult?.candidates) {
          entry.station_match_candidates = matchResult.candidates;
          entry.station_match_notes = `Review needed: multiple candidates or uncertain match`;
        }
        
        // Add notes if no safe match
        if (matchResult?.status === 'no_safe_station_match') {
          entry.station_match_notes = `No safe match found. GPS [${window.__gpsLat}, ${window.__gpsLon}], name "${stationInfo.station_name}", chain "${stationInfo.station_chain}"`;
        }
        
        return entry;
      });
    
    await base44.entities.FuelPrice.bulkCreate(entries);
    setStep("saved");
    setSubmitting(false);
  };

  const reset = () => {
    setStep("photo");
    setImageUrl(null);
    setDetectedPrices(emptyPrices());
    setStationInfo(s => ({ ...s, station_chain: "", station_name: "" }));
  };

  if (step === "saved") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardContent className="pt-10 pb-8">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={56} />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Takk for bidraget!</h2>
            <p className="text-slate-500 mb-6">Prisene er lagret og hjelper andre norske bilister.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={reset}>Logg en til</Button>
              <Link to={createPageUrl("Dashboard")}>
                <Button className="bg-blue-600 hover:bg-blue-700">Se statistikk</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <Link to={createPageUrl("Dashboard")} className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 mb-6 text-sm">
          <ArrowLeft size={16} /> Tilbake til oversikt
        </Link>

        {step === "photo" && (
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <PhotoCapture onPhoto={handlePhoto} onSkip={() => setStep("confirm")} />
            </CardContent>
          </Card>
        )}

        {step === "confirm" && (
          <ConfirmPrice
            detectedPrices={detectedPrices}
            setDetectedPrices={setDetectedPrices}
            stationInfo={stationInfo}
            setStationInfo={setStationInfo}
            imageUrl={imageUrl}
            onSubmit={handleSubmit}
            loading={submitting}
            locationLoading={locationLoading}
          />
        )}
      </div>
    </div>
  );
}