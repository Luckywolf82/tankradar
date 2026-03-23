import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, ExternalLink, Pencil, Trash2, Check, X, ChevronDown, ChevronUp } from "lucide-react";

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const STATUS_COLORS = {
  active: "bg-green-100 text-green-700",
  archived_duplicate: "bg-red-100 text-red-600",
};

function EditableField({ label, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const handleSave = () => {
    onSave(draft === "" ? null : draft);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs text-slate-400 w-28 shrink-0">{label}</span>
      {editing ? (
        <>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-7 text-xs flex-1"
            autoFocus
          />
          <button onClick={handleSave} className="text-green-600 hover:text-green-700"><Check size={14} /></button>
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
        </>
      ) : (
        <>
          <span className="text-sm text-slate-800 flex-1 truncate">{value ?? <span className="text-slate-300 italic">–</span>}</span>
          <button onClick={() => { setDraft(value ?? ""); setEditing(true); }} className="text-slate-300 hover:text-slate-600"><Pencil size={12} /></button>
        </>
      )}
    </div>
  );
}

function StationCard({ station, onUpdated, onDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const mapUrl = station.latitude && station.longitude
    ? `https://www.google.com/maps?q=${station.latitude},${station.longitude}`
    : null;

  const handleFieldSave = async (field, value) => {
    setSaving(true);
    await base44.entities.Station.update(station.id, { [field]: value });
    onUpdated({ ...station, [field]: value });
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.Station.delete(station.id);
    onDeleted(station.id);
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm truncate">{station.name}</span>
            {station.chain && <Badge variant="outline" className="text-xs">{station.chain}</Badge>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[station.status] || "bg-slate-100 text-slate-600"}`}>
              {station.status || "unknown"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
            <span className="font-mono truncate">{station.id}</span>
            {station.city && <span>· {station.city}</span>}
            {station.latitude && station.longitude && (
              <span>· {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <MapPin size={15} />
            </a>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-0.5 bg-slate-50">
          <EditableField label="Navn" value={station.name} onSave={(v) => handleFieldSave("name", v)} />
          <EditableField label="Kjede" value={station.chain} onSave={(v) => handleFieldSave("chain", v)} />
          <EditableField label="By" value={station.city} onSave={(v) => handleFieldSave("city", v)} />
          <EditableField label="Adresse" value={station.address} onSave={(v) => handleFieldSave("address", v)} />
          <EditableField label="Postnummer" value={station.postalCode} onSave={(v) => handleFieldSave("postalCode", v)} />
          <EditableField label="Region" value={station.region} onSave={(v) => handleFieldSave("region", v)} />
          <EditableField label="Breddegrad" value={station.latitude != null ? String(station.latitude) : null} onSave={(v) => handleFieldSave("latitude", v ? parseFloat(v) : null)} />
          <EditableField label="Lengdegrad" value={station.longitude != null ? String(station.longitude) : null} onSave={(v) => handleFieldSave("longitude", v ? parseFloat(v) : null)} />
          <EditableField label="Status" value={station.status} onSave={(v) => handleFieldSave("status", v)} />
          <EditableField label="Kilde" value={station.sourceName} onSave={(v) => handleFieldSave("sourceName", v)} />

          {saving && <p className="text-xs text-blue-600 mt-2">Lagrer...</p>}

          {/* Map embed */}
          {station.latitude && station.longitude && (
            <div className="mt-3">
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
              >
                <ExternalLink size={12} />
                Vis i Google Maps
              </a>
            </div>
          )}

          {/* Delete */}
          <div className="pt-3 border-t border-slate-200 mt-3">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Er du sikker? Dette kan ikke angres.</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Sletter..." : "Slett"}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-500 hover:text-slate-700">Avbryt</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"
              >
                <Trash2 size={12} />
                Slett stasjon
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StationEditor() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);

    let stations = [];

    // Search by ID (exact)
    if (q.length > 20 && !q.includes(" ")) {
      try {
        const byId = await base44.entities.Station.filter({ id: q });
        if (byId?.length) { stations = byId; }
      } catch { /* ignore */ }
    }

    // Search by name (contains, case-insensitive via multiple fetches)
    if (!stations.length) {
      const all = await base44.entities.Station.list("-created_date", 2000);
      const lower = q.toLowerCase();
      stations = all.filter(s =>
        (s.name || "").toLowerCase().includes(lower) ||
        (s.chain || "").toLowerCase().includes(lower) ||
        (s.city || "").toLowerCase().includes(lower) ||
        (s.id || "").toLowerCase().includes(lower)
      );
    }

    setResults(stations.slice(0, 50));
    setLoading(false);
  }, [query]);

  const handleUpdated = (updated) => {
    setResults(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleDeleted = (id) => {
    setResults(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Søk etter stasjonsnavn, kjede, by eller stasjons-ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          className="flex-1"
        />
        <Button onClick={search} disabled={loading || !query.trim()}>
          <Search size={15} className="mr-1.5" />
          {loading ? "Søker..." : "Søk"}
        </Button>
      </div>

      {searched && !loading && (
        <p className="text-xs text-slate-400">
          {results.length === 0
            ? "Ingen stasjoner funnet."
            : `${results.length} stasjon${results.length !== 1 ? "er" : ""} funnet${results.length === 50 ? " (maks 50 vist)" : ""}`}
        </p>
      )}

      <div className="space-y-2">
        {results.map(station => (
          <StationCard
            key={station.id}
            station={station}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        ))}
      </div>
    </div>
  );
}