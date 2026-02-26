'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList, Loader2, Copy, Send, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { QuestionnaireResponse, QuestionnaireAIEvaluation, QuestionnaireStatus } from '@/lib/supabase/types';

interface QuestionnaireSectionProps {
  candidateId: string;
  questionnaireStatus: QuestionnaireStatus | null;
  requestId?: string;
}

const statusLabels: Record<string, string> = {
  sent: 'Надіслано',
  in_progress: 'Заповнюється',
  completed: 'Заповнено',
  expired: 'Прострочено',
  skipped: 'Пропущено',
};

const statusColors: Record<string, string> = {
  sent: 'text-blue-600 bg-blue-50',
  in_progress: 'text-orange-600 bg-orange-50',
  completed: 'text-green-600 bg-green-50',
  expired: 'text-red-600 bg-red-50',
  skipped: 'text-gray-600 bg-gray-50',
};

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-blue-600';
  if (score >= 4) return 'text-orange-600';
  return 'text-red-600';
}

export function QuestionnaireSection({ candidateId, questionnaireStatus, requestId: propRequestId }: QuestionnaireSectionProps) {
  const [response, setResponse] = useState<QuestionnaireResponse | null>(null);
  const [evaluation, setEvaluation] = useState<QuestionnaireAIEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [requestId, setRequestId] = useState<string | undefined>(propRequestId);
  const [requests, setRequests] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');

  // Fetch questionnaire response if already sent
  useEffect(() => {
    if (questionnaireStatus && questionnaireStatus !== 'skipped') {
      setLoading(true);
      fetch(`/api/questionnaire/response/${candidateId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setResponse(data);
            if (data.ai_evaluation && typeof data.ai_evaluation === 'object' && !('error' in data.ai_evaluation)) {
              setEvaluation(data.ai_evaluation as QuestionnaireAIEvaluation);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [candidateId, questionnaireStatus]);

  // Fetch available requests if no requestId provided
  useEffect(() => {
    if (!requestId && !questionnaireStatus) {
      fetch('/api/requests')
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const active = (data || []).filter((r: { status: string }) => r.status === 'active');
          setRequests(active);
          if (active.length === 1) {
            setSelectedRequestId(active[0].id);
          }
        })
        .catch(() => {});
    }
  }, [requestId, questionnaireStatus]);

  const handleSend = async () => {
    const effectiveRequestId = requestId || selectedRequestId;
    if (!effectiveRequestId) {
      toast.error('Оберіть вакансію для анкети');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/questionnaire/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, request_id: effectiveRequestId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send');
      }

      const data = await res.json();

      // Copy link to clipboard
      await navigator.clipboard.writeText(data.questionnaire_url);
      toast.success('Анкету надіслано! Посилання скопійовано в буфер обміну', {
        description: data.questionnaire_url,
        duration: 8000,
      });

      // Refresh data
      setResponse(null);
      setLoading(true);
      const refreshRes = await fetch(`/api/questionnaire/response/${candidateId}`);
      if (refreshRes.ok) {
        setResponse(await refreshRes.json());
      }
      setLoading(false);
    } catch (error) {
      console.error('Error sending questionnaire:', error);
      toast.error(error instanceof Error ? error.message : 'Помилка відправки анкети');
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    if (response?.token) {
      const appUrl = window.location.origin;
      const url = `${appUrl}/questionnaire/${response.token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Посилання скопійовано');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Soft Skills Анкета
        </CardTitle>
        {questionnaireStatus && (
          <Badge variant="outline" className={statusColors[questionnaireStatus] || ''}>
            {statusLabels[questionnaireStatus] || questionnaireStatus}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Завантаження...
          </div>
        ) : !questionnaireStatus ? (
          /* Not sent yet */
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Анкета ще не надіслана. Надішліть анкету soft skills кандидату.
            </p>
            {!requestId && requests.length > 0 && (
              <Select value={selectedRequestId} onValueChange={setSelectedRequestId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Оберіть вакансію" />
                </SelectTrigger>
                <SelectContent>
                  {requests.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleSend} disabled={sending || (!requestId && !selectedRequestId)}>
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Надіслати анкету
            </Button>
          </div>
        ) : questionnaireStatus === 'sent' || questionnaireStatus === 'in_progress' ? (
          /* Waiting for response */
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {questionnaireStatus === 'sent'
                ? 'Очікуємо на відповіді кандидата.'
                : 'Кандидат почав заповнювати анкету.'}
            </p>
            {response?.expires_at && (
              <p className="text-xs text-muted-foreground">
                Дедлайн: {new Date(response.expires_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Скопіювати посилання
            </Button>
          </div>
        ) : questionnaireStatus === 'expired' ? (
          <div className="space-y-3">
            <p className="text-sm text-red-600">Дедлайн для заповнення анкети минув.</p>
            <Button onClick={handleSend} disabled={sending} variant="outline">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Надіслати повторно
            </Button>
          </div>
        ) : questionnaireStatus === 'completed' && evaluation ? (
          /* Show results */
          <div className="space-y-4">
            {/* Overall score */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">AI Оцінка</span>
              <span className={`text-2xl font-bold ${response?.ai_score ? getScoreColor(response.ai_score) : ''}`}>
                {response?.ai_score}/10
              </span>
            </div>

            {/* Summary */}
            <p className="text-sm">{evaluation.summary}</p>

            {/* Strengths */}
            {evaluation.strengths && evaluation.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-1">Сильні сторони</h4>
                <ul className="text-sm space-y-1">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Concerns */}
            {evaluation.concerns && evaluation.concerns.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-700 mb-1">Зони уваги</h4>
                <ul className="text-sm space-y-1">
                  {evaluation.concerns.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-600">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per competency */}
            {evaluation.per_competency && evaluation.per_competency.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <h4 className="text-sm font-semibold">По компетенціях</h4>
                {evaluation.per_competency.map((pc, i) => (
                  <div key={i} className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{pc.competency_name}</span>
                      <p className="text-xs text-muted-foreground">{pc.comment}</p>
                    </div>
                    <span className={`text-sm font-bold ${getScoreColor(pc.score)}`}>
                      {pc.score}/10
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendation */}
            {evaluation.recommendation && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold mb-1">Рекомендація</h4>
                <p className="text-sm text-muted-foreground">{evaluation.recommendation}</p>
              </div>
            )}

            {/* Toggle answers */}
            <button
              type="button"
              onClick={() => setShowAnswers(!showAnswers)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {showAnswers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Переглянути відповіді кандидата
            </button>

            {showAnswers && response?.answers && (
              <div className="space-y-3 border-t pt-3">
                {(response.questions as unknown as Array<{ question_id: string; competency_name: string; text: string }>).map((q) => (
                  <div key={q.question_id}>
                    <p className="text-xs font-semibold text-muted-foreground">[{q.competency_name}] {q.text}</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap bg-gray-50 rounded p-2">
                      {(response.answers as Record<string, string>)[q.question_id] || '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : questionnaireStatus === 'completed' && !evaluation ? (
          /* Completed but evaluation pending or errored */
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Анкету заповнено. AI оцінка обробляється...
            </p>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
