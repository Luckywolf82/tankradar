import React, { useState, useRef, useEffect } from "react";
import { Search, X, Plus, Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * StationSearchPicker
 * Søk stasjoner på navn og velg dem som kanonisk eller duplikat.
 * Returnerer valgte stasjons-IDer til parent via onSelectCanonical / onAddDuplicate.
 */
export default function StationSearchPicker({ onSelectCanonical, onAddDuplicate, canonicalId, duplicateIds = [] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = async (q) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const all = await base44.entities.Station.list("name", 2000);
      const lower = q.toLowerCase();
      const filtered = all.filter(s =>
        (s.name || "").toLowerCase().includes(lower) ||
        (s.chain || "").toLowerCase().includes(lower) ||
        (s.city || "").toLowerCase().includes(lower)
      ).slice(0, 12);
      setResults(filtered);
      setOpen(true);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  const isCanonical = (id) => id === canonicalId;
  const isDuplicate = (id) => duplicateIds.includes(id);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Søk stasjon på navn, kjede eller by…"
          className="w-full text-xs border border-blue-200 rounded px-3 py-1.5 pl-8 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        {loading && <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
        {!loading && query && (
          <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={12} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map(s => {
            const canon = isCanonical(s.id);
            const dup = isDuplicate(s.id);
            return (
              <div key={s.id} className={`flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 ${canon ? "bg-green-50" : dup ? "bg-amber-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {[s.chain, s.city].filter(Boolean).join(" · ") || "Ukjent"}
                  </p>
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  {canon ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Kanonisk</span>
                  ) : (
                    <button
                      onClick={() => { onSelectCanonical(s); setOpen(false); setQuery(""); }}
                      className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700 transition-colors"
                      title="Sett som kanonisk"
                    >
                      Kanonisk
                    </button>
                  )}
                  {dup ? (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Dup</span>
                  ) : !canon ? (
                    <button
                      onClick={() => { onAddDuplicate(s); setOpen(false); setQuery(""); }}
                      className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded hover:bg-amber-600 transition-colors"
                      title="Legg til som duplikat"
                    >
                      + Dup
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {open && !loading && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow p-3 text-xs text-slate-500 text-center">
          Ingen stasjoner funnet for «{query}»
        </div>
      )}
    </div>
  );
}