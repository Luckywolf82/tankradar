import React from "react";
import { Map, Eye, Search, Globe } from "lucide-react";

/**
 * MapVerificationLinks
 * Shows quick map links so operators can verify a coordinate before approving.
 * Props: lat (number), lng (number)
 */
export default function MapVerificationLinks({ lat, lng }) {
  if (!lat || !lng) return null;

  const latF = Number(lat).toFixed(6);
  const lngF = Number(lng).toFixed(6);

  const links = [
    {
      label: "Se kart",
      icon: Map,
      href: `https://maps.google.com/?q=${latF},${lngF}`,
      cls: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
    },
    {
      label: "Street View",
      icon: Eye,
      href: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latF},${lngF}`,
      cls: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
    },
    {
      label: "Søk i Google Maps",
      icon: Search,
      href: `https://www.google.com/maps/search/?api=1&query=${latF},${lngF}`,
      cls: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100",
    },
    {
      label: "Satellitt",
      icon: Globe,
      href: `https://www.google.com/maps/@${latF},${lngF},18z/data=!3m1!1e3`,
      cls: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
    },
  ];

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-semibold text-slate-600 mb-1.5">Posisjon og kontroll</p>
      <p className="text-xs text-slate-500 mb-0.5">
        {latF}, {lngF}
      </p>
      <p className="text-xs text-slate-400 mb-2">
        Bruk kart, Street View og satellitt for å kontrollere om dette faktisk er en bensinstasjon før du godkjenner.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {links.map(({ label, icon: Icon, href, cls }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${cls}`}
          >
            <Icon size={11} />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}