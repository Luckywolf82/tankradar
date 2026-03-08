import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, AlertCircle, CheckCircle2, Zap, ExternalLink, MapPin, Globe } from 'lucide-react';

// Helper function to build external lookup URLs
const buildExternalLinks = (candidate) => {
  const links = {};

  // Google Listing URL
  if (candidate.googlePlaceId) {
    links.googleListing = `https://www.google.com/maps/place/?q=place_id:${candidate.googlePlaceId}`;
  } else if (candidate.googleMapsUrl) {
    links.googleListing = candidate.googleMapsUrl;
  } else if (candidate.googleBusinessUrl) {
    links.googleListing = candidate.googleBusinessUrl;
  }

  // Google Maps Search URL
  if (candidate.stationName) {
    const parts = [candidate.stationName];
    if (candidate.city) parts.push(candidate.city);
    const query = encodeURIComponent(parts.join(', '));
    
    if (candidate.latitude && candidate.longitude) {
      links.googleMapsSearch = `https://www.google.com/maps/search/${query}/@${candidate.latitude},${candidate.longitude},15z`;
    } else {
      links.googleMapsSearch = `https://www.google.com/maps/search/${query}`;
    }
  }

  // Website URL
  if (candidate.website) {
    links.website = candidate.website;
  } else if (candidate.url) {
    links.website = candidate.url;
  } else if (candidate.homepage) {
    links.website = candidate.homepage;
  } else if (candidate.sourceUrl) {
    links.website = candidate.sourceUrl;
  }

  // Street View URL
  if (candidate.latitude && candidate.longitude) {
    links.streetView = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${candidate.latitude},${candidate.longitude}`;
  }

  return links;
};

export default function ChainUnconfirmedManualReviewUI() {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalPending, setTotalPending] = useState(0);
  const [appliedDecision, setAppliedDecision] = useState(null);
  const [decisionLoading, setDecisionLoading] = useState(false);

  const loadNextCandidate = async () => {
    setLoading(true);
    try {
      const result = await base44.functions.invoke('getNextChainUnconfirmedManualCandidate', {});
      setCandidate(result.data.candidate);
      setTotalPending(result.data.totalPending || 0);
      setAppliedDecision(null);
    } catch (error) {
      console.error('Failed to load next candidate:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyDecision = async (decision) => {
    if (!candidate) return;
    setDecisionLoading(true);
    try {
      const result = await base44.functions.invoke('applyManualChainUnconfirmedDecision', {
        reviewId: candidate.reviewId,
        stationId: candidate.stationId,
        decision,
      });
      
      setAppliedDecision({
        decision,
        success: result.data.success,
        newReview: result.data.newReviewCreated,
      });

      // Auto-load next candidate
      setTimeout(() => loadNextCandidate(), 800);
    } catch (error) {
      console.error('Failed to apply decision:', error);
      setAppliedDecision({
        decision,
        success: false,
        error: error.message,
      });
    } finally {
      setDecisionLoading(false);
    }
  };

  if (!candidate && !loading) {
    return (
      <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Manual Chain-Unconfirmed Review Workflow</h3>
        <p className="text-sm text-blue-800 mb-4">
          Review pending chain_unconfirmed records one at a time. No mass automation — human-in-the-loop only.
        </p>
        <Button
          onClick={loadNextCandidate}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          Get Next Manual Candidate
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-blue-900">Manual Review Workflow</h3>
            <p className="text-sm text-blue-800">{totalPending} total pending chain_unconfirmed reviews</p>
          </div>
          <Button
            onClick={loadNextCandidate}
            disabled={loading || decisionLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4" />
            Next
          </Button>
        </div>
      </div>

      {appliedDecision && appliedDecision.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <div className="font-semibold text-green-900">Decision applied</div>
              <div className="text-sm text-green-800 mt-1">
                {appliedDecision.decision.replace(/_/g, ' ')}
              </div>
              {appliedDecision.newReview && (
                <div className="text-xs text-green-700 mt-1">
                  Created new review: {appliedDecision.newReview.review_type}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {appliedDecision && !appliedDecision.success && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <div className="font-semibold text-red-900">Error applying decision</div>
              <div className="text-sm text-red-800 mt-1">{appliedDecision.error}</div>
            </div>
          </div>
        </div>
      )}

      {candidate && !appliedDecision && (() => {
        const externalLinks = buildExternalLinks(candidate);
        return (
        <Card className="border-l-4 border-l-purple-400">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{candidate.stationName}</CardTitle>
                <div className="text-sm text-gray-600 mt-1">
                  {candidate.city && <span>{candidate.city}</span>}
                  {candidate.city && candidate.operator && <span> • </span>}
                  {candidate.operator && <span>Op: {candidate.operator}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className={`px-3 py-1 rounded text-xs font-semibold ${
                  candidate.priorityLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                  candidate.priorityLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {candidate.priorityLevel} Priority
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-sm font-semibold text-gray-700 mb-2">Analysis</div>
              <div className="space-y-1 text-sm">
                <div><strong>Category:</strong> {candidate.semanticCategory.replace(/_/g, ' ')}</div>
                <div><strong>Confidence:</strong> {(candidate.semanticConfidence * 100).toFixed(0)}%</div>
                <div><strong>Reason:</strong> {candidate.priorityReason}</div>
                {candidate.semanticSignals.length > 0 && (
                  <div><strong>Signals:</strong> {candidate.semanticSignals.join(', ')}</div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-sm font-semibold text-gray-700 mb-2">Station Info</div>
              <div className="space-y-1 text-sm text-gray-600">
                {candidate.chain && <div>Chain: {candidate.chain}</div>}
                {candidate.stationType && <div>Type: {candidate.stationType}</div>}
                {candidate.latitude && (
                  <div>Location: {candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}</div>
                )}
              </div>
            </div>

            {(externalLinks.googleListing || externalLinks.googleMapsSearch || externalLinks.website || externalLinks.streetView) && (
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <div className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1">
                  <ExternalLink className="w-4 h-4" />
                  External Links
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {externalLinks.googleListing && (
                    <a
                      href={externalLinks.googleListing}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white border border-blue-200 rounded text-xs font-medium text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      Google Listing
                    </a>
                  )}
                  {externalLinks.googleMapsSearch && (
                    <a
                      href={externalLinks.googleMapsSearch}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white border border-blue-200 rounded text-xs font-medium text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      Maps Search
                    </a>
                  )}
                  {externalLinks.website && (
                    <a
                      href={externalLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white border border-blue-200 rounded text-xs font-medium text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Globe className="w-3 h-3" />
                      Website
                    </a>
                  )}
                  {externalLinks.streetView && (
                    <a
                      href={externalLinks.streetView}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white border border-blue-200 rounded text-xs font-medium text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      Street View
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-sm font-semibold text-blue-900 mb-2">Recommended: {candidate.recommendedManualAction.replace(/_/g, ' ')}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => applyDecision('reclassify_local_fuel_site')}
                disabled={decisionLoading}
                className="bg-green-600 hover:bg-green-700 text-xs"
              >
                Local Fuel Site
              </Button>
              <Button
                onClick={() => applyDecision('reclassify_specialty_fuel')}
                disabled={decisionLoading}
                className="bg-amber-600 hover:bg-amber-700 text-xs"
              >
                Specialty Fuel
              </Button>
              <Button
                onClick={() => applyDecision('reclassify_non_fuel_poi')}
                disabled={decisionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-xs"
              >
                Non-Fuel POI
              </Button>
              <Button
                onClick={() => applyDecision('mark_service_or_trade_not_fuel')}
                disabled={decisionLoading}
                className="bg-slate-600 hover:bg-slate-700 text-xs"
              >
                Service/Trade
              </Button>
              <Button
                onClick={() => applyDecision('mark_foreign_or_border_manual')}
                disabled={decisionLoading}
                className="bg-red-600 hover:bg-red-700 text-xs"
              >
                Foreign/Border
              </Button>
              <Button
                onClick={() => applyDecision('keep_chain_unconfirmed')}
                disabled={decisionLoading}
                variant="outline"
                className="text-xs"
              >
                Keep as-is
              </Button>
            </div>

            <Button
              onClick={loadNextCandidate}
              disabled={loading || decisionLoading}
              variant="ghost"
              className="w-full text-gray-600 flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Skip / Load Next
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Zap className="w-4 h-4 animate-spin" />
              Loading next candidate...
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}