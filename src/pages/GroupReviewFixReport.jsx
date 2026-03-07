import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function GroupReviewFixReport() {
  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <h1 className="text-3xl font-bold mb-6">Fix-rapport: Gruppe-behandling og konsistens</h1>

      {/* Problem 1 Summary */}
      <Card className="mb-6 border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            PROBLEM 1: Manglende splitt-funksjonalitet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Symptom:</strong> Grupper med åpenbart ulike stasjoner (f.eks. Uno-X Østre Rosten og St1 Tiller)
            kunne ikke deles opp manuelt.
          </p>
          <p>
            <strong>Årsak:</strong> Review-siden hadde ingen "splitt gruppe" handling — kun mulighet til å godkjenne
            hele gruppen eller behandle enkeltkandidat.
          </p>
          <p>
            <strong>Løsning:</strong> Lagt til "Splitt gruppe" knapp som aktiverer split-visning.
          </p>
        </CardContent>
      </Card>

      {/* Problem 2 Summary */}
      <Card className="mb-6 border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            PROBLEM 2: Topptall stemte ikke med gruppebehanding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Symptom:</strong> Når en gruppe med 9 kandidater behandles, forsvinner hele gruppen fra UI,
            men topptallet "Venter på gjennomgang" går bare ned med 1.
          </p>
          <p>
            <strong>Roten til problemet:</strong> <code>handleApprove()</code> godkjente kun én kandidat.
            Resten av gruppen ble ikke oppdatert i databasen — de forble i "pending" status
            selv om UI skjulte dem.
          </p>
          <p>
            <strong>Resultat:</strong> UI-visning (grupper som enhet) og database-status (individuelle kandidater)
            var ikke synkronisert.
          </p>
        </CardContent>
      </Card>

      {/* Solution Section */}
      <Card className="mb-6 bg-green-50 border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            LØSNING: 4-trinns reparasjon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="bg-white p-3 rounded border border-green-200">
            <strong className="block mb-1">1. Automatisk gruppebehanding</strong>
            <p className="text-gray-700 text-xs">
              Når <code>handleApprove()</code> kalles for en kandidat med gruppeutgaver, 
              mottar den nå hele gruppen som parameter. Alle andre medlemmer merkes automatisk som <code>duplicate</code>:
            </p>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
{`for (const member of groupMembers) {
  if (member.id !== candidate.id) {
    await update(member.id, { 
      status: 'duplicate',
      notes: 'Duplicate of approved station'
    });
  }
}`}
            </pre>
            <p className="text-gray-700 text-xs mt-2">
              <strong>Resultat:</strong> All kandidater i gruppen får endelig status i en operasjon.
            </p>
          </div>

          <div className="bg-white p-3 rounded border border-green-200">
            <strong className="block mb-1">2. Splitt-funksjonalitet</strong>
            <p className="text-gray-700 text-xs">
              Nye "Splitt gruppe" knapp aktiverer split-visning. Når splittet er aktivt:
            </p>
            <ul className="list-disc list-inside text-gray-700 text-xs mt-1 space-y-1">
              <li>Gruppen vises som separate kort (ikke gruppert)</li>
              <li>Admin kan håndtere hver kandidat separat (ikke som gruppe)</li>
              <li>Når "Godkjenn (enkelt)" trykkes, kun den kandidaten godkjennes</li>
              <li>Angre splitting-knapp returnerer til gruppevisning</li>
            </ul>
          </div>

          <div className="bg-white p-3 rounded border border-green-200">
            <strong className="block mb-1">3. Topptall-konsistens</strong>
            <p className="text-gray-700 text-xs">
              Topptallene beregnes direkte fra database-status:
            </p>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
{`const newStats = { pending: 0, approved: 0, rejected: 0, duplicate: 0 };
all.forEach(c => newStats[c.status]++);`}
            </pre>
            <p className="text-gray-700 text-xs mt-2">
              <strong>Resultat:</strong> Etter hver gruppebehanding (eller splitt + enkelt-behandling)
              gjenladdes alle kandidater → alle medlemmer får riktig status → topptall reflekterer faktisk database.
            </p>
          </div>

          <div className="bg-white p-3 rounded border border-green-200">
            <strong className="block mb-1">4. Konsistenssjekk-komponent</strong>
            <p className="text-gray-700 text-xs">
              Ny <code>ReviewConsistencyCheck</code> vises øverst på review-siden:
            </p>
            <ul className="list-disc list-inside text-gray-700 text-xs mt-1 space-y-1">
              <li>Henter alle kandidater fra database</li>
              <li>Grupperer dem via <code>groupStationCandidates</code></li>
              <li>Verifiserer: (kandidater i grupper) + (individuelle) = total database</li>
              <li>Viser <span className="bg-green-100">✓ OK</span> eller <span className="bg-red-100">⚠ AVVIK</span></li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* How It Works Now */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Slik fungerer det nå
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="bg-blue-50 p-3 rounded">
            <strong className="block mb-2">Scenario A: Gruppe godkjent som samme sted</strong>
            <ol className="list-decimal list-inside text-gray-700 text-xs space-y-1">
              <li>Gruppe med 3 kandidater vises gruppert</li>
              <li>Admin velger hovednavn (eller bruker standard) og trykker "Godkjenn"</li>
              <li>System oppretter 1 Station + approver utvalgt kandidat + marker 2 andre som duplicate</li>
              <li>Alle 3 kandidater får endelig status (1 approved + 2 duplicate)</li>
              <li>Gruppe forsvinner fra UI, topptall går ned med 3</li>
            </ol>
          </div>

          <div className="bg-purple-50 p-3 rounded">
            <strong className="block mb-2">Scenario B: Gruppe splittet (ulike stasjoner)</strong>
            <ol className="list-decimal list-inside text-gray-700 text-xs space-y-1">
              <li>Gruppe med 3 kandidater vises gruppert</li>
              <li>Admin ser at Uno-X og St1 er ulike og trykker "Splitt gruppe"</li>
              <li>Samme 3 kandidater vises nå som separate kort</li>
              <li>Admin trykker "Godkjenn (enkelt)" på hver → hver oppretter egen Station</li>
              <li>Hver kandidat godkjennes individuelt (ingen automatisk duplicate-merking)</li>
              <li>Alle 3 forsvinner fra UI når alle er approved, topptall går ned med 3</li>
            </ol>
          </div>

          <div className="bg-orange-50 p-3 rounded">
            <strong className="block mb-2">Scenario C: Blanda behandling</strong>
            <ol className="list-decimal list-inside text-gray-700 text-xs space-y-1">
              <li>Gruppe splittet: Uno-X + St1 separate</li>
              <li>Uno-X godkjent som enkelt</li>
              <li>St1 avvist (ikke en gyldig stasjon)</li>
              <li>Begge forsvinner fra UI med endelig status</li>
              <li>Topptall reflekterer dette: pending -2</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Why it failed before */}
      <Card className="mb-6 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-base">Hvorfor topptallet bare gikk ned med 1 før</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Oppgitte funn:</strong> 173 venter → gruppe med 9 behandles → topptall går til 172 (ned med 1, ikke 9).
          </p>
          <p>
            <strong>Forklaring:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li><code>handleApprove()</code> oppdaterte kun 1 kandidat: <code>status = 'approved'</code></li>
            <li>De andre 8 i gruppen: forble i <code>status = 'pending'</code> i database</li>
            <li>
              UI henter grupper fra <code>groupStationCandidates</code> som henter <strong>pending-kandidater</strong>.
              Gruppe forsvinner fra UI fordi hovedkandidaten var "approved"
            </li>
            <li>
              Men topptall telles fra database: <code>all.filter(c =&gt; c.status === 'pending')</code>
              De 8 forble pending → topptall reflekterer kun 1 oppdatert kandidat
            </li>
          </ol>
          <p className="mt-2 text-xs bg-yellow-100 p-2 rounded">
            <strong>Kort:</strong> UI skjulte hele gruppen, men database hadde bare oppdatert 1 kandidat.
            Topptall var korrekt for databasen, men UI var villedende.
          </p>
        </CardContent>
      </Card>

      {/* Verification */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="text-base">Hvordan verifisere at det nå fungerer</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>1. Åpne StationCandidateReview</strong> og se "Konsistenssjekk" øverst.
            Det skal vise grønt ✓ hvis database er konsistent.
          </p>
          <p>
            <strong>2. Godkjenn en gruppe</strong> (ikke splittet). 
            Hele gruppen skal fjernes fra UI, og topptall skal gå ned med antall kandidater i gruppen.
          </p>
          <p>
            <strong>3. Splitt en ny gruppe</strong> og godkjenn kandidatene separat.
            UI skal vise dem individuelt, og hver kan godkjennes eller avvises separat.
          </p>
          <p>
            <strong>4. Sjekk konsistens igjen</strong> — skal fortsatt være grønt ✓.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}