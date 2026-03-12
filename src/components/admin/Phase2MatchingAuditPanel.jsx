import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Lock, ClipboardList } from "lucide-react";

export default function Phase2MatchingAuditPanel() {
  const governanceLocks = [
    { rule: "Poengterskel for auto-match", value: "≥65", status: "locked" },
    { rule: "Poengterskel for review", value: "≥35", status: "locked" },
    { rule: "Minimum dominance gap", value: "≥10 (flere kandidater)", status: "locked" },
    { rule: "Avstandsbånd", value: "30m / 75m / 150m / 300m", status: "locked" },
    { rule: "Kjede-matching", value: "eksakt match + høy-konfidensport", status: "locked" },
    { rule: "Navnelikhet (scoring)", value: "bigram-basert (95/85/70/50)", status: "locked" },
    { rule: "Stedssignal", value: "+10 match / -15 konflikt / 0 usikker", status: "locked" },
    { rule: "Review-ruting", value: "lav poengsum eller utilstrekkelig gap", status: "locked" },
  ];

  const validationStatus = [
    { component: "Kjede-normalisering", status: "parser_validated", coverage: "Kjente kjeder (konservativ liste)" },
    { component: "Parsing av stasjonsnavn", status: "parser_validated", coverage: "Kjede + stedsnøkkelord" },
    { component: "Match-scoring", status: "parser_validated", coverage: "Avstand + kjede + navn + sted" },
    { component: "Beslutningsport", status: "parser_validated", coverage: "Poengsum + dominance gap-logikk" },
    { component: "Live kildevalidering", status: "not_yet_validated", coverage: "Krever ekte GooglePlaces-data" },
    { component: "Full pipeline (E2E)", status: "not_yet_validated", coverage: "Krever representativt utvalg" },
  ];

  const manualTestCases = [
    {
      category: "Eksakte kjente stasjoner",
      cases: [
        "Circle K Moholt (eksakt navn + kjede)",
        "Uno-X Heimdal (eksakt navn + kjede)",
        "Shell Sentrum (eksakt navn + kjede)",
      ],
      expectedOutcome: "MATCHED_STATION_ID (poengsum ≥65)",
    },
    {
      category: "Støyende / variant-navn",
      cases: [
        "circlek moholt (lowercase + kjede)",
        "CIRCLE K MOHOLT (uppercase + kjede)",
        "Circle K - Moholt (tegnsettingsvariant)",
        "CK Moholt (forkortelse + sted)",
      ],
      expectedOutcome: "MATCHED_STATION_ID eller REVIEW_NEEDED (avhenger av likhet)",
    },
    {
      category: "Fler-kandidat-tvetydighet",
      cases: [
        "Moholt (kun sted, ingen kjede)",
        "Heimdal (kun sted, ingen kjede)",
        "Stasjon nær to Circle K-avdelinger",
      ],
      expectedOutcome: "REVIEW_NEEDED (flere kandidater – sjekk dominance gap)",
    },
    {
      category: "Avstandsbånd-grensetilfeller",
      cases: [
        "Stasjon på 30m (svært nær)",
        "Stasjon ved 75m-grense",
        "Stasjon ved 150m-grense",
        "Stasjon ved 300m-grense",
        "Stasjon ved 301m+ (for langt unna)",
      ],
      expectedOutcome: "Bekreft avstandssignaler: 30 / 20 / 10 / 5 / 0 henholdsvis",
    },
    {
      category: "Kjede-uoverensstemmelse",
      cases: [
        "Circle K rapportert, men kun Uno-X i nærheten",
        "Shell rapportert, men kjede ukjent i databasen",
        "Høy-konfidenskonflikt skal rutes til review",
      ],
      expectedOutcome: "NO_SAFE_STATION_MATCH eller REVIEW_NEEDED (kjede-port)",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Operator note */}
      <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
        <p className="font-semibold mb-1">Leseliste for operatør</p>
        <p>Denne delen viser hva som er låst i Phase 2 og hvordan matching skal verifiseres uten å endre logikken.
        Bruk <strong>Matching-preview</strong> for all praktisk testing. Reglene her kan ikke justeres fra panelet.</p>
      </div>

      {/* Section 1: Governance Lock Summary */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock size={16} className="text-amber-600" />
            Låste regler (Phase 2 — Frosset)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
            Alle terskelverdier, porter og poengregler er låst og kan ikke endres uten eksplisitt governance-godkjennelse.
          </div>
          <div className="space-y-2">
            {governanceLocks.map((lock, idx) => (
              <div key={idx} className="flex items-start justify-between bg-slate-50 rounded p-2.5 text-xs">
                <div>
                  <p className="font-medium text-slate-900">{lock.rule}</p>
                  <p className="text-slate-600 font-mono mt-0.5">{lock.value}</p>
                </div>
                <Badge className="bg-red-100 text-red-700 border-red-200 shrink-0 ml-2">
                  {lock.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Validation Status */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle size={16} className="text-blue-600" />
            Valideringsstatus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded p-2 mb-3">
            Parser-validering bekrefter tolkningslogikk mot fixtures. Live-validering er ikke gjennomført — krever representativt utvalg fra GooglePlaces.
          </div>
          <div className="space-y-2">
            {validationStatus.map((item, idx) => (
              <div key={idx} className="bg-slate-50 rounded p-2.5 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-slate-900">{item.component}</p>
                  {item.status === "parser_validated" ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 size={12} className="mr-1 inline" />
                      Parser-validert
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                      <AlertCircle size={12} className="mr-1 inline" />
                      Ikke validert ennå
                    </Badge>
                  )}
                </div>
                <p className="text-slate-600">{item.coverage}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Manual Test Checklist */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList size={16} className="text-slate-600" />
            Manuell testliste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2 mb-3">
            Bruk matching-preview-panelet for å verifisere parseatferd på representative testcaser.
          </div>
          <div className="space-y-4">
            {manualTestCases.map((testGroup, idx) => (
              <div key={idx} className="border-l-2 border-slate-300 pl-4 py-2">
                <p className="text-xs font-semibold text-slate-900 mb-2">{testGroup.category}</p>
                <ul className="space-y-1 mb-2">
                  {testGroup.cases.map((testCase, caseIdx) => (
                    <li key={caseIdx} className="text-xs text-slate-600 flex items-start">
                      <span className="inline-block w-4 h-4 mr-2 mt-0.5 border border-slate-300 rounded" />
                      {testCase}
                    </li>
                  ))}
                </ul>
                <p className="text-xs bg-blue-50 border border-blue-200 rounded p-1.5 text-blue-800">
                  <span className="font-semibold">Forventet utfall:</span> {testGroup.expectedOutcome}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 4: GitHub-synlighet */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600" />
            GitHub-synlighet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-slate-700 space-y-2">
            <p>
              <strong>Status for kjøringslogg:</strong> Oppføringer 26–28 (Phase 25-implementeringshistorikk) er nå synlige i GitHub etter publisering. Tidligere oppføringer med status «ikke bekreftet i GitHub» er bekreftet tilgjengelige.
            </p>
            <p className="text-slate-600">
              Dette Phase 2 Matching Audit-panelet (oppføring 34) og governance-synkronisering (oppføring 35) er planlagt for GitHub-publisering.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-4 text-xs text-slate-600">
          <p className="mb-2">
            <strong>Formål:</strong> Verifisere at Phase 2-parseren og matchingmotoren oppfører seg konsistent med låste governance-regler. All matchinglogikk er parser-validert mot fixtures og låst mot produksjonsendringer.
          </p>
          <p className="mb-2">
            <strong>Valideringsstatus:</strong> Parser-atferd er validert. Live kildevalidering (ekte GooglePlaces-data) gjenstår.
          </p>
          <p>
            <strong>Neste steg:</strong> Etter manuell verifisering på representative utvalg via preview-panelet kan live-validering gjennomføres med ekte GooglePlaces-data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}