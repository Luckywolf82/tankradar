import React, { useState } from "react";
import { Share2, Check } from "lucide-react";
import { createPageUrl } from "@/utils";

/**
 * Deler stasjonspris via native Web Share API (app/mobil) eller kopierer URL (browser).
 * Props:
 *   stationId: string
 *   stationName: string
 *   priceNok: number
 *   fuelType: string  (f.eks. "gasoline_95")
 */
const fuelTypeLabel = {
  gasoline_95: "Bensin 95",
  gasoline_98: "Bensin 98",
  diesel: "Diesel",
  bensin_95: "Bensin 95",
  bensin_98: "Bensin 98",
  diesel_premium: "Diesel+",
};

export default function SharePriceButton({ stationId, stationName, priceNok, fuelType, className = "" }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e) => {
    e.stopPropagation();

    const url = `${window.location.origin}${createPageUrl(`StationDetails?stationId=${stationId}`)}`;
    const fuelLabel = fuelTypeLabel[fuelType] || fuelType;
    const text = `${stationName} – ${fuelLabel}: ${priceNok?.toFixed(2)} kr/l`;

    if (navigator.share) {
      // Native share (app / mobil)
      await navigator.share({ title: "TankRadar", text, url });
    } else {
      // Fallback: kopier kun URL til utklippstavlen
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      title="Del pris"
      className={`flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors ${className}`}
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Share2 size={14} />}
    </button>
  );
}