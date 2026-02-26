'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FinalDecisionPanelProps {
  candidateId: string;
  testTaskStatus: string;
  testTaskAiScore: number | null;
}

export function FinalDecisionPanel({
  candidateId,
  testTaskStatus,
  testTaskAiScore,
}: FinalDecisionPanelProps) {
  const [isDeciding, setIsDeciding] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);
  const [matchRequestId, setMatchRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch match data to get request_id and existing final_decision
    async function fetchMatchData() {
      try {
        const res = await fetch(`/api/candidates/${candidateId}/match-info`);
        if (res.ok) {
          const data = await res.json();
          setMatchRequestId(data.request_id || null);
          setDecision(data.final_decision || null);
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchMatchData();
  }, [candidateId]);

  // Only show when test task is evaluated and no decision yet
  if (testTaskStatus !== 'evaluated' || loading) return null;
  if (decision) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {decision === 'invite' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            Фінальне рішення
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant={decision === 'invite' ? 'default' : 'destructive'}>
            {decision === 'invite' ? 'Запрошено на інтерв\'ю' : 'Відмовлено'}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  const handleDecision = async (selectedDecision: 'invite' | 'reject') => {
    if (!matchRequestId) {
      toast.error('Не знайдено прив\'язку до вакансії');
      return;
    }

    setIsDeciding(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/final-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: selectedDecision,
          request_id: matchRequestId,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      setDecision(selectedDecision);
      toast.success(
        selectedDecision === 'invite'
          ? 'Кандидата запрошено на інтерв\'ю'
          : 'Рішення збережено. Відмову буде надіслано через 24 години.'
      );
    } catch {
      toast.error('Помилка збереження рішення');
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Фінальне рішення</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {testTaskAiScore && (
          <p className="text-sm text-muted-foreground">
            AI оцінка тестового: <span className="font-bold">{testTaskAiScore}/10</span>
          </p>
        )}

        <p className="text-sm">Що робимо з кандидатом?</p>

        <div className="flex gap-3">
          <Button
            onClick={() => handleDecision('invite')}
            disabled={isDeciding}
            className="bg-green-600 hover:bg-green-700"
          >
            {isDeciding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Запросити на інтерв'ю
          </Button>
          <Button
            onClick={() => handleDecision('reject')}
            disabled={isDeciding}
            variant="destructive"
          >
            {isDeciding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Відмовити
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
