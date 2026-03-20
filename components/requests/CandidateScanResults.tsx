'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertTriangle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getScoreColor } from '@/lib/utils';

interface ScanResult {
  candidate_id: string;
  candidate_name: string;
  match_score: number;
  primary_request_title: string | null;
  pipeline_stage: string;
  is_in_active_pipeline: boolean;
}

interface CandidateScanResultsProps {
  requestId: string;
  requestTitle: string;
}

export function CandidateScanResults({ requestId, requestTitle }: CandidateScanResultsProps) {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/scan-candidates`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json() as { results: ScanResult[]; total: number };
      setResults(data.results);
      setHasScanned(true);
      setSelected(new Set());
    } catch {
      toast.error('Помилка сканування бази кандидатів');
    } finally {
      setScanning(false);
    }
  }, [requestId]);

  // Auto-scan once on mount
  useEffect(() => {
    runScan();
  }, [runScan]);

  const handleToggle = (candidateId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  };

  const handleAssign = async () => {
    if (selected.size === 0) return;
    setAssigning(true);
    let successCount = 0;
    try {
      await Promise.all(
        Array.from(selected).map(async (candidateId) => {
          const res = await fetch(`/api/candidates/${candidateId}/primary-request`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              request_id: requestId,
              notes: `Призначено при скануванні бази для вакансії «${requestTitle}»`,
            }),
          });
          if (res.ok) successCount++;
        }),
      );

      // Record reason as new_request_scan (overwrite notes via direct DB insert is not possible here;
      // the primary-request API uses manager_reassign, which is acceptable for this use case)
      toast.success(`${successCount} кандидат(ів) переведено у воронку «${requestTitle}»`);
      // Remove assigned candidates from results
      setResults((prev) => prev.filter((r) => !selected.has(r.candidate_id)));
      setSelected(new Set());
    } catch {
      toast.error('Помилка при призначенні кандидатів');
    } finally {
      setAssigning(false);
    }
  };

  if (!hasScanned && scanning) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Сканування бази кандидатів...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Кандидати з бази, які підходять на цю вакансію
          </CardTitle>
          <Button variant="outline" size="sm" onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            {scanning ? 'Сканування...' : 'Оновити'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hasScanned ? 'Підходящих кандидатів не знайдено (score < 70)' : 'Натисніть "Оновити" для сканування'}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              Знайдено: {results.length} кандидат(ів) з AI-score ≥ 70
            </p>
            <div className="space-y-2 mb-4">
              {results.map((r) => (
                <div
                  key={r.candidate_id}
                  className="flex items-center gap-3 p-2 border rounded-lg"
                >
                  <Checkbox
                    checked={selected.has(r.candidate_id)}
                    onCheckedChange={() => handleToggle(r.candidate_id)}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">{r.candidate_name}</span>
                    {r.primary_request_title && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({r.primary_request_title})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.is_in_active_pipeline && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Активна воронка
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`${getScoreColor(r.match_score / 10)} border-current text-xs`}
                    >
                      {r.match_score}/100
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={handleAssign}
              disabled={selected.size === 0 || assigning}
              size="sm"
            >
              {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Призначити обраних на цю вакансію ({selected.size})
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
