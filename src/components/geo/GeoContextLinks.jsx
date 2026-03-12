import React from "react";
import { Map, Eye, Satellite, Search } from "lucide-react";

function isValidCoord(lat, lng) {
  return (
    lat != null &&
    lng != null &&
    !isNaN(parseFloat(lat)) &&
    !isNaN(parseFloat(lng)) &&
    parseFloat(lat) !== 0 &&
    parseFloat(lng) !== 0
  );
}

export default function GeoContextLinks({
  latitude,
  longitude,
  label,
  stationName,
  city,
  compact = false,
}) {
  if (!isValidCoord(latitude, longitude)) return null;

  const lat = parseFloat(latitude).toFixed(5);
  const lng = parseFloat(longitude).toFixed(5);

  const links = [
    {
      href: `https://www.google.com/maps?q=${lat},${lng}`,
      icon: <Map size={11} />,
      label: "Åpne kart",
    },
    {
      href: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`,
      icon: <Eye size={11} />,
      label: "Street View",
    },
    {
      href: `https://www.google.com/maps?q=${lat},${lng}&t=k`,
      icon: <Satellite size={11} />,
      label: "Satellitt",
    },
    {
      href: `https://www.google.com/maps/search/bensinstasjon/@${lat},${lng},15z`,
      icon: <Search size={11} />,
      label: "Søk bensinstasjon",
    },
  ];

  if (stationName) {
    const q = encodeURIComponent([stationName, city].filter(Boolean).join(" "));
    links.push({
      href: `https://www.google.com/maps/search/${q}/@${lat},${lng},15z`,
      icon: <Search size={11} />,
      label: stationName,
    });
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
          >
            {l.icon}
            {l.label}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-2">
      {label && <p className="text-[11px] text-slate-500 mb-1">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
          >
            {l.icon}
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}