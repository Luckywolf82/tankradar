import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Play, Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Phase2MatchingTestHarness() {
  const [testInput, setTestInput] = useState(
    "Circle K Moholt | circle_k | Trondheim | 63.4190 | 10.4300\nEsso Heimdal | esso | Trondheim | 63.3450 | 10.3570"
  );
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const parseTestCases = () => {
    return testInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        if (parts.length !== 5) return null;
        return {
          station_name: parts[0],
          chain: parts[1] || null,
          city: parts[2] || null,
          latitude: parts[3] ? parseFloat(parts[3]) : null,
          longitude: parts[4] ? parseFloat(parts[4]) : null,
        };
      })
      .filter((tc) => tc !== null);
  };

  const handleRunTests = async () => {
    setRunning(true);
    setError(null);
    setResults([]);

    const testCases = parseTestCases();
    if (testCases.length === 0) {
      setError("Ingen gyldige testcaser funnet. Format: stasjonsnavn | kjede | by | breddegrad | lengdegrad");
      setRunning(false);
      return;
    }

    const testResults = [];

    try {
      for (const tc of testCases) {
        const response = await base44.functions.invoke(
          "matchStationForUserReportedPrice",
          {
            preview_mode: true,
            station_name: tc.station_name,
            station_chain: tc.chain || null,
            city: tc.city || null,
            latitude: tc.latitude,
            longitude: tc.longitude,
          }
        );

        const data = response.data;
        testResults.push({
          input_name: tc.station_name,
          input_chain: tc.chain,
          input_city: tc.city,
          parsed_name_base: data.parsed_name_base || "—",
          parsed_chain: data.parsed_chain || "—",
          parsed_location: data.parsed_location || "—",
          top_candidate: data.top_candidates?.[0]?.name || "—",
          score: data.top_candidates?.[0]?.final_score
            ? data.top_candidates[0].final_score.toFixed(2)
            : "—",
          dominance_gap: data.dominance_gap !== undefined ? data.dominance_gap.toFixed(2) : "—",
          final_decision: data.final_decision || "—",
          review_needed: data.final_decision === "review_needed",
        });
      }

      setResults(testResults);
    } catch (err) {
      setError(err.message || "Feil ved kjøring av tester");
    } finally {
      setRunning(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      test_case_count: results.length,
      results: results,
      summary: calculateSummary(),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `phase2-matching-tester-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const calculateSummary = () => {
    if (results.length === 0) return null;

    const autoMatches = results.filter((r) => r.final_decision === "matched").length;
    const reviewRequired = results.filter((r) => r.review_needed).length;
    const noMatch = results.filter((r) => r.final_decision === "no_safe_match").length;

    const gaps = results
      .filter((r) => r.dominance_gap !== "—")
      .map((r) => parseFloat(r.dominance_gap));
    const avgGap = gaps.length > 0 ? (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2) : "—";

    return {
      total_tests: results.length,
      auto_matches: autoMatches,
      review_required: reviewRequired,
      no_safe_match: noMatch,
      average_dominance_gap: avgGap,
    };
  };

  const summary = calculateSummary();

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Play size={16} className="text-slate-600" />
            Batchtest av matching
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs text-slate-700 bg-blue-50 border border-blue-200 rounded p-3">
            <p className="font-semibold text-blue-800 mb-1">Brukes for å kjøre flere testcaser mot preview-modus og eksportere resultat.</p>
            <p className="text-blue-700">Dette er ikke et daglig driftsverktøy — bruk det for å verifisere matchingmotoratferd over et sett med eksempler.</p>
            <p className="mt-2 text-blue-600 font-mono">Format: stasjonsnavn | kjede | by | breddegrad | lengdegrad</p>
          </div>

          <Textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Circle K Moholt | circle_k | Trondheim | 63.4190 | 10.4300"
            className="h-32 font-mono text-xs"
            disabled={running}
          />

          <Button
            onClick={handleRunTests}
            disabled={running || testInput.trim().length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {running ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Kjører tester...
              </>
            ) : (
              <>
                <Play size={16} className="mr-2" />
                Kjør batchtest
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Testfeil</p>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Metrics */}
      {summary && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" />
              Oppsummeringsmetrikk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-50 rounded p-3">
                <p className="text-xs text-slate-600 font-medium">Totale tester</p>
                <p className="text-lg font-bold text-slate-900">{summary.total_tests}</p>
              </div>
              <div className="bg-green-50 rounded p-3">
                <p className="text-xs text-green-600 font-medium">Automatiske matcher</p>
                <p className="text-lg font-bold text-green-900">{summary.auto_matches}</p>
              </div>
              <div className="bg-amber-50 rounded p-3">
                <p className="text-xs text-amber-600 font-medium">Krever review</p>
                <p className="text-lg font-bold text-amber-900">{summary.review_required}</p>
              </div>
              <div className="bg-red-50 rounded p-3">
                <p className="text-xs text-red-600 font-medium">Ingen trygg match</p>
                <p className="text-lg font-bold text-red-900">{summary.no_safe_match}</p>
              </div>
              <div className="bg-blue-50 rounded p-3">
                <p className="text-xs text-blue-600 font-medium">Gjennomsnittlig dominance gap</p>
                <p className="text-lg font-bold text-blue-900">{summary.average_dominance_gap}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Testresultater</CardTitle>
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download size={14} />
                Eksporter JSON
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Stasjonsnavn</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Kjede</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">By</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Tolket base</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Tolket kjede</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Beste kandidat</th>
                    <th className="text-center px-3 py-2 font-semibold text-slate-600">Poeng</th>
                    <th className="text-center px-3 py-2 font-semibold text-slate-600">Gap</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Beslutning</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-900 font-medium">{result.input_name}</td>
                      <td className="px-3 py-2 text-slate-700">{result.input_chain || "—"}</td>
                      <td className="px-3 py-2 text-slate-700">{result.input_city || "—"}</td>
                      <td className="px-3 py-2 text-slate-700">{result.parsed_name_base}</td>
                      <td className="px-3 py-2 text-slate-700">{result.parsed_chain}</td>
                      <td className="px-3 py-2 text-slate-700 font-mono">{result.top_candidate}</td>
                      <td className="px-3 py-2 text-center font-mono text-slate-700">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {result.score}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-slate-700">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {result.dominance_gap}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {result.review_needed ? (
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-medium">
                            Review
                          </span>
                        ) : result.final_decision === "matched" ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                            Matchet
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                            Ingen match
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}