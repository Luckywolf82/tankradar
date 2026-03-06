import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import PhotoCapture from "../components/logprice/PhotoCapture.jsx";
import ConfirmPrice from "../components/logprice/ConfirmPrice.jsx";

// Map latitude to a Norwegian region
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

// Guess station chain from nearby place name
function guessChain(name) {
  if (!name) return "";
  const n = name.toLowerCase();
  if (n.includes("circle k") || n.includes("statoil")) return "Circle K";
  if (n.includes("uno-x") || n.includes("unox")) return "Uno-X";
  if (n.includes("esso")) return "Esso";
  if (n.includes("shell")) return "Shell";
  if (n.includes("yx")) return "YX";
  if (n.includes("best")) return "Best";
  return "Annet";
}

export default function LogPrice() {
  const [step, setStep] = useState("photo"); // photo | confirm | saved
  const [imageUrl, setImageUrl] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    price: "",
    fuel_type: "bensin_95",
    station_chain: "",
    station_name: "",
    city: "",
    region: "",
    date_observed: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    ai_detected: false,
  });

  const handlePhoto = async (file) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setStep("confirm");

    // 1. Upload image and ask AI to read price
    setLocationLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // AI reads price from image
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Look at this image of a fuel price sign at a Norwegian gas station. Extract the prices shown. Return only a JSON object with fields: 'bensin_95' (number or null), 'bensin_98' (number or null), 'diesel' (number or null), 'diesel_premium' (number or null). Only include prices clearly visible. Norwegian prices are typically between 15 and 25 kr per liter.`,
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

      // Pick the first detected price
      const fuelMap = { bensin_95: "bensin_95", bensin_98: "bensin_98", diesel: "diesel", diesel_premium: "diesel_premium" };
      let detectedPrice = null;
      let detectedType = "bensin_95";
      for (const [key] of Object.entries(fuelMap)) {
        if (aiResult[key]) {
          detectedPrice = aiResult[key];
          detectedType = key;
          break;
        }
      }

      if (detectedPrice) {
        setForm(f => ({ ...f, price: detectedPrice.toFixed(2), fuel_type: detectedType, ai_detected: true }));
      }
    } catch (e) {
      console.error("AI price extraction failed", e);
    }

    // 2. Get GPS location and reverse geocode
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const { latitude, longitude } = pos.coords;
      const region = latLonToRegion(latitude, longitude);

      // Reverse geocode with Nominatim
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=14`,
        { headers: { "Accept-Language": "no" } }
      ).then(r => r.json());

      const city = geo?.address?.city || geo?.address?.town || geo?.address?.village || geo?.address?.suburb || "";

      // Search for nearby gas station
      const poiRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=bensinstasjon&lat=${latitude}&lon=${longitude}&format=json&limit=3&radius=200`,
        { headers: { "Accept-Language": "no" } }
      ).then(r => r.json());

      const nearbyStation = poiRes?.[0]?.display_name || "";
      const chain = guessChain(nearbyStation);

      setForm(f => ({
        ...f,
        city,
        region,
        station_chain: chain || f.station_chain,
        station_name: nearbyStation ? nearbyStation.split(",")[0] : f.station_name,
      }));
    } catch (e) {
      console.error("GPS/geocode failed", e);
    }

    setLocationLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await base44.entities.FuelPrice.create({
      ...form,
      price: parseFloat(form.price),
    });
    setStep("saved");
    setSubmitting(false);
  };

  if (step === "saved") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardContent className="pt-10 pb-8">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={56} />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Takk for bidraget!</h2>
            <p className="text-slate-500 mb-6">Prisen din er lagret og hjelper andre norske bilister.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setStep("photo"); setImageUrl(null); setForm(f => ({ ...f, price: "", ai_detected: false })); }}>
                Logg en til
              </Button>
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
              <PhotoCapture
                onPhoto={handlePhoto}
                onSkip={() => setStep("confirm")}
              />
            </CardContent>
          </Card>
        )}

        {step === "confirm" && (
          <ConfirmPrice
            form={form}
            setForm={setForm}
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