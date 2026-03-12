import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const STEPS = [
  {
    num: 1,
    title: "Kjør trygge automatiske steg",
    type: "auto",
    where: "SuperAdmin → Drift og systemstatus",
    desc: "Kjør «Full review pipeline» og auto-bekreft-funksjoner. Dette reduserer køen automatisk — gjør dette FØR du starter manuell behandling.",
  },
  {
    num: 2,
    title: "Behandle grupperte kandidater",
    type: "manual",
    where: "Denne siden — Grupperte kandidater",
    desc: "Velg kanonisk navn for hvert sted. Godkjenn den beste kandidaten — resten markeres automatisk som duplikat.",
  },
  {
    num: 3,
    title: "Behandle enkeltkandidater",
    type: "manual",
    where: "Denne siden — Enkeltkandidater",
    desc: "Godkjenn eller avvis kandidater som ikke er gruppert med andre.",
  },
  {
    num: 4,
    title: "Behandle stasjonsreview",
    type: "manual",
    where: "Denne siden — Stasjonsreview",
    desc: "Gjennomgå stasjonsposter flagget av pipelinen. Les typeforklaringen før du godkjenner — ulike typer har ulik betydning for «Godkjenn».",
  },
  {
    num: 5,
    title: "Behandle kjede ikke bekreftet",
    type: "manual",
    where: "Denne siden — Kjede ikke bekreftet",
    desc: "Gå gjennom én og én stasjon der kjede ikke ble bekreftet automatisk. Eksternt kartoppslag er tilgjengelig per sak.",
  },
  {
    num: 6,
    title: "Kontroller at køen synker",
    type: "auto",
    where: "Konsistenssjekk nedenfor",
    desc: "Sjekk at konsistenssjekken viser grønn status og at ventende-tellerne synker. Gjenta steg 1–5 ved behov.",
  },
];

export default function QueueWorkflowGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl mb-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-slate-700">Arbeidsflyt: Slik tømmer du køen</p>
          <p className="text-xs text-slate-400 mt-0.5">6 steg — start med automatiske steg, deretter manuell gjennomgang</p>
        </div>
        {open
          ? <ChevronUp size={15} className="text-slate-400 shrink-0" />
          : <ChevronDown size={15} className="text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-slate-200 px-4 py-3 space-y-3">
          {STEPS.map(step => (
            <div key={step.num} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center">
                {step.num}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <p className="text-xs font-semibold text-slate-800">{step.title}</p>
                  <span className={`text-xs border rounded px-1.5 py-0.5 ${
                    step.type === "auto"
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-amber-100 text-amber-700 border-amber-200"
                  }`}>
                    {step.type === "auto" ? "Automatisk" : "Manuell"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{step.desc}</p>
                <p className="text-xs text-slate-400 mt-0.5 italic">Sted: {step.where}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}