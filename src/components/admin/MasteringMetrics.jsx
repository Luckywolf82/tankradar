import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BarChart3 } from 'lucide-react';

export default function MasteringMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const stations = await base44.asServiceRole.entities.Station.list();
      const candidates = await base44.asServiceRole.entities.StationCandidate.list();
      const reviews = await base44.asServiceRole.entities.StationReview.list();

      const candidateStats = {
        pending: candidates.filter(c => c.status === 'pending').length,
        approved: candidates.filter(c => c.status === 'approved').length,
        rejected: candidates.filter(c => c.status === 'rejected').length,
        duplicate: candidates.filter(c => c.status === 'duplicate').length,
      };

      const reviewStats = {
        pending: reviews.filter(r => r.status === 'pending').length,
        approved: reviews.filter(r => r.status === 'approved').length,
        rejected: reviews.filter(r => r.status === 'rejected').length,
        duplicate: reviews.filter(r => r.status === 'duplicate').length,
      };

      const sourceBreakdown = stations.reduce((acc, s) => {
        acc[s.sourceName] = (acc[s.sourceName] || 0) + 1;
        return acc;
      }, {});

      setMetrics({
        totalStations: stations.length,
        totalCandidates: candidates.length,
        totalReviews: reviews.length,
        candidateStats,
        reviewStats,
        sourceBreakdown,
        stationsWithChain: stations.filter(s => s.chain && s.chain !== 'unknown' && s.chain !== null).length,
        stationsMissingChain: stations.filter(s => !s.chain || s.chain === 'unknown' || s.chain === null).length,
        stationsMissingCity: stations.filter(s => !s.city).length,
        stationsMissingAddress: stations.filter(s => !s.address).length,
      });
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportStations = async () => {
    setExporting(true);
    try {
      const { data } = await base44.functions.invoke('exportStationDataCSV');
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stations_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportReviews = async () => {
    setExporting(true);
    try {
      const { data } = await base44.functions.invoke('exportStationReviewsCSV');
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `station_reviews_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-600">Laster metrikker...</div>;
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-slate-700" />
          <h3 className="text-lg font-bold text-slate-900">Mastering Metrics</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
           <Card>
             <CardContent className="pt-4">
               <div className="text-2xl font-bold text-blue-600">{metrics.totalStations}</div>
               <div className="text-xs text-gray-600 mt-1">Total Stasjoner</div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="pt-4">
               <div className="text-2xl font-bold text-purple-600">{metrics.stationsWithChain}</div>
               <div className="text-xs text-gray-600 mt-1">Med kjede</div>
               <div className="text-xs text-red-600 mt-1">Mangler: {metrics.stationsMissingChain}</div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="pt-4">
               <div className="text-2xl font-bold text-orange-600">{metrics.totalCandidates}</div>
               <div className="text-xs text-gray-600 mt-1">Kandidater totalt</div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="pt-4">
               <div className="text-2xl font-bold text-pink-600">{metrics.totalReviews}</div>
               <div className="text-xs text-gray-600 mt-1">Reviews totalt</div>
             </CardContent>
           </Card>
         </div>

        {/* Missing Fields Summary */}
        <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
          <h4 className="text-xs font-semibold text-red-900 mb-2">Manglende feltdata</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-sm">
              <span className="font-semibold text-red-700">{metrics.stationsMissingChain}</span>
              <span className="text-xs text-red-600"> mangler kjede</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold text-red-700">{metrics.stationsMissingCity}</span>
              <span className="text-xs text-red-600"> mangler by</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold text-red-700">{metrics.stationsMissingAddress}</span>
              <span className="text-xs text-red-600"> mangler adresse</span>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Status Breakdown */}
      <div>
        <h4 className="font-semibold text-slate-900 mb-3">Google Places Kandidater</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-yellow-400">
            <CardContent className="pt-4">
              <div className="text-xl font-bold text-yellow-600">{metrics.candidateStats.pending}</div>
              <div className="text-xs text-gray-600 mt-1">Pending</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-400">
            <CardContent className="pt-4">
              <div className="text-xl font-bold text-green-600">{metrics.candidateStats.approved}</div>
              <div className="text-xs text-gray-600 mt-1">Approved</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-400">
            <CardContent className="pt-4">
              <div className="text-xl font-bold text-red-600">{metrics.candidateStats.rejected}</div>
              <div className="text-xs text-gray-600 mt-1">Rejected</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="pt-4">
              <div className="text-xl font-bold text-gray-600">{metrics.candidateStats.duplicate}</div>
              <div className="text-xs text-gray-600 mt-1">Duplicate</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Status Breakdown */}
      {metrics.totalReviews > 0 && (
        <div>
          <h4 className="font-semibold text-slate-900 mb-3">Station-Data Reviews</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-purple-400">
              <CardContent className="pt-4">
                <div className="text-xl font-bold text-purple-600">{metrics.reviewStats.pending}</div>
                <div className="text-xs text-gray-600 mt-1">Pending</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="text-xl font-bold text-green-600">{metrics.reviewStats.approved}</div>
                <div className="text-xs text-gray-600 mt-1">Approved</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4">
                <div className="text-xl font-bold text-red-600">{metrics.reviewStats.rejected}</div>
                <div className="text-xs text-gray-600 mt-1">Rejected</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-indigo-400">
              <CardContent className="pt-4">
                <div className="text-xl font-bold text-indigo-600">{metrics.reviewStats.duplicate}</div>
                <div className="text-xs text-gray-600 mt-1">Duplicate</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Source Breakdown */}
      {Object.keys(metrics.sourceBreakdown).length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-900 mb-3">Stasjoner etter kilde</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(metrics.sourceBreakdown).map(([source, count]) => (
              <Card key={source}>
                <CardContent className="pt-4">
                  <div className="text-lg font-bold text-slate-700">{count}</div>
                  <div className="text-xs text-gray-600 mt-1 truncate">{source}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="border-t pt-6">
        <h4 className="font-semibold text-slate-900 mb-3">Eksporter data</h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleExportStations}
            disabled={exporting}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Stasjoner CSV
          </Button>
          <Button
            onClick={handleExportReviews}
            disabled={exporting}
            className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Reviews CSV
          </Button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Eksporterer alle relevante felter for videre analyse.
        </p>
      </div>
    </div>
  );
}