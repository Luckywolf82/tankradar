import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function ReviewConsistencyCheck() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      // Get all candidates
      const allCandidates = await base44.entities.StationCandidate.list();
      
      // Get grouping (only groups PENDING candidates)
      const groupRes = await base44.functions.invoke('groupStationCandidates');
      const { groups = [], ungrouped = [] } = groupRes.data;

      // Count by status
      const byStatus = { pending: 0, approved: 0, rejected: 0, duplicate: 0 };
      allCandidates.forEach(c => {
        byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      });

      // Group stats — only for pending candidates
      const totalInGroups = groups.reduce((sum, g) => sum + g.candidates.length, 0);
      const pendingCount = byStatus.pending;
      const pendingGrouped = totalInGroups + ungrouped.length;
      
      // Consistency: all PENDING candidates should be either in groups or ungrouped
      const isConsistent = pendingGrouped === pendingCount;

      setReport({
        total: allCandidates.length,
        byStatus,
        groups: {
          count: groups.length,
          candidatesInGroups: totalInGroups,
          duplicateGroups: groups.filter(g => g.groupType === 'duplicate').length,
          sameLocationGroups: groups.filter(g => g.groupType === 'same_location').length,
        },
        ungrouped: ungrouped.length,
        consistency: {
          isConsistent,
          formula: `${totalInGroups} (grouped) + ${ungrouped.length} (ungrouped) = ${pendingGrouped} pending (should be ${pendingCount} pending in database)`,
          note: `Approved/rejected/duplicate (${byStatus.approved + byStatus.rejected + byStatus.duplicate}) er utenfor gruppering — det er forventet.`,
        },
      });
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-600">Sjekker konsistens...</div>;
  if (!report) return null;

  const isConsistent = report.consistency.isConsistent;

  return (
    <Card className={`mt-4 ${isConsistent ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {isConsistent ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Konsistenssjekk: OK</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>Konsistenssjekk: AVVIK</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div>
          <strong>Total kandidater i database:</strong> {report.total}
        </div>
        <div>
          <strong>Status-fordeling:</strong> {report.byStatus.pending} pending, {report.byStatus.approved} approved, 
          {report.byStatus.rejected} rejected, {report.byStatus.duplicate} duplicate
        </div>
        <div>
          <strong>Gruppering:</strong> {report.groups.count} grupper ({report.groups.duplicateGroups} duplikat, {report.groups.sameLocationGroups} samme-sted)
        </div>
        <div>
          <strong>I grupper:</strong> {report.groups.candidatesInGroups} kandidater
        </div>
        <div>
          <strong>Ikke i grupper:</strong> {report.ungrouped} kandidater
        </div>
        <div className={`p-2 rounded mt-2 font-mono text-xs ${isConsistent ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
          {report.consistency.formula}
        </div>
        {!isConsistent && (
          <div className="mt-2 p-2 bg-yellow-100 text-yellow-900 rounded text-xs">
            ⚠️ Avvik oppdaget! Dette kan bety at groupStationCandidates-funksjonen ikke er synkronisert med databasen.
          </div>
        )}
      </CardContent>
    </Card>
  );
}