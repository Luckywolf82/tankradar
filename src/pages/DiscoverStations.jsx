import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';

export default function DiscoverStations() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const TRONDHEIM_LAT = 63.4305;
  const TRONDHEIM_LNG = 10.3951;

  const handleDiscoverTrondheim = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await base44.functions.invoke('discoverGooglePlacesCandidates', {
        latitude: TRONDHEIM_LAT,
        longitude: TRONDHEIM_LNG,
        radiusKm: 25,
      });

      setResult(response.data);
    } catch (err) {
      setError(err.message || 'Noe gikk galt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 pb-24">
      <h1 className="text-3xl font-bold mb-2">Google Places Station Discovery</h1>
      <p className="text-gray-600 mb-6">
        Søk etter og importer drivstoffstasjoner fra Google Places for å utvide stasjonskatalogen.
      </p>

      {/* Discovery for Trondheim */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Trondheim / Trøndelag
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Radius: 25km rundt Trondheim sentrum. Søk vil bli deduplisert automatisk mot eksisterende stasjoner.
          </p>

          <Button
            onClick={handleDiscoverTrondheim}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Søker...
              </>
            ) : (
              'Start søk'
            )}
          </Button>

          {error && (
            <div className="bg-red-50 p-3 rounded border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-3 bg-gray-50 p-4 rounded">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{result.gpResultsCount}</div>
                  <div className="text-xs text-gray-600">Returnert fra GP</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{result.candidatesCreated}</div>
                  <div className="text-xs text-gray-600">Nye kandidater</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">{result.dedupedCount}</div>
                  <div className="text-xs text-gray-600">Duplikater</div>
                </div>
              </div>

              <div className="pt-3 border-t text-sm">
                <strong>Neste steg:</strong> Gå til{' '}
                <a href="#" className="text-blue-600 hover:underline">
                  Station-kandidater
                </a>{' '}
                for å gjennomgå og godkjenne nye stasjoner.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Om denne prosessen</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Automatisk deduplisering:</strong> Stasjoner som allerede finnes blir automatisk identifisert basert på navn, kjede og avstand.
          </p>
          <p>
            <strong>Manuelle godkjennelser:</strong> Alle nye kandidater må godkjennes manuelt før de legges til i stasjonskatalogen.
          </p>
          <p>
            <strong>Fixture-validering:</strong> Dette er Phase 1 (pilot). Vi tester først med Trondheim for å se om GP-discovery faktisk gir verdi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}