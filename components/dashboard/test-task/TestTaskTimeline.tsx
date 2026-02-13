'use client';

import { useState } from 'react';
import { Clock, CheckCircle, AlertTriangle, FileText, Send, Star, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Loader2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface TestTaskTimelineProps {
  candidate: {
    id: string;
    test_task_status?: string | null;
    test_task_sent_at?: string | null;
    test_task_original_deadline?: string | null;
    test_task_current_deadline?: string | null;
    test_task_extensions_count?: number | null;
    test_task_submitted_at?: string | null;
    test_task_late_by_hours?: number | null;
    test_task_ai_score?: number | null;
    test_task_ai_evaluation?: string | null;
    test_task_candidate_feedback?: string | null;
    test_task_submission_text?: string | null;
  };
}

const statusLabels: Record<string, string> = {
  not_sent: 'Не надіслано',
  scheduled: 'Заплановано',
  sent: 'Надіслано',
  submitted_on_time: 'Здано вчасно',
  submitted_late: 'Здано із запізненням',
  evaluating: 'Оцінюється',
  evaluated: 'Оцінено',
  approved: 'Прийнято',
  rejected: 'Відхилено',
};

const statusColors: Record<string, string> = {
  not_sent: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sent: 'bg-yellow-100 text-yellow-700',
  submitted_on_time: 'bg-green-100 text-green-700',
  submitted_late: 'bg-orange-100 text-orange-700',
  evaluating: 'bg-purple-100 text-purple-700',
  evaluated: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} дн. тому`;
  if (hours > 0) return `${hours} год. тому`;
  return 'щойно';
}

const PREVIEW_LENGTH = 500;

function SubmissionPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > PREVIEW_LENGTH;

  return (
    <div className="pt-3 border-t">
      <h4 className="text-sm font-semibold mb-2">Відповідь кандидата</h4>
      <div className={`bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap ${!expanded ? 'max-h-40 overflow-hidden' : ''}`}>
        {expanded || !isLong ? text : text.substring(0, PREVIEW_LENGTH) + '...'}
      </div>
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 text-xs h-7"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>Згорнути <ChevronUp className="w-3 h-3 ml-1" /></>
          ) : (
            <>Показати повністю <ChevronDown className="w-3 h-3 ml-1" /></>
          )}
        </Button>
      )}
    </div>
  );
}

function DecisionPanel({ candidateId, onDecided }: { candidateId: string; onDecided: (decision: string) => void }) {
  const [activeDecision, setActiveDecision] = useState<'approved' | 'rejected' | null>(null);
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleDecisionClick = async (decision: 'approved' | 'rejected') => {
    setActiveDecision(decision);
    setIsGenerating(true);
    setMessage('');

    try {
      const res = await fetch('/api/test-task/generate-decision-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, decision }),
      });

      if (!res.ok) throw new Error('Failed to generate message');

      const data = await res.json();
      setMessage(data.message);
    } catch {
      toast.error('Не вдалося згенерувати повідомлення');
      setActiveDecision(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!activeDecision || !message.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/test-task/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          decision: activeDecision,
          message: message.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to send decision');

      const data = await res.json();

      if (data.telegramSent) {
        toast.success(activeDecision === 'approved' ? 'Кандидата прийнято, повідомлення надіслано' : 'Відмову надіслано кандидату');
      } else {
        toast.success('Рішення збережено (повідомлення не вдалося надіслати в Telegram)');
      }

      onDecided(activeDecision);
    } catch {
      toast.error('Не вдалося надіслати рішення');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    setActiveDecision(null);
    setMessage('');
  };

  // Show buttons if no decision is being made
  if (!activeDecision) {
    return (
      <div className="pt-3 border-t">
        <h4 className="text-sm font-semibold mb-3">Рішення</h4>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => handleDecisionClick('approved')}
          >
            <ThumbsUp className="w-4 h-4 mr-1" />
            Прийняти
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDecisionClick('rejected')}
          >
            <ThumbsDown className="w-4 h-4 mr-1" />
            Відхилити
          </Button>
        </div>
      </div>
    );
  }

  // Show message editor
  return (
    <div className="pt-3 border-t">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">
          {activeDecision === 'approved' ? 'Повідомлення про прийняття' : 'Повідомлення про відмову'}
        </h4>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancel} disabled={isSending}>
          <X className="w-3 h-3 mr-1" />
          Скасувати
        </Button>
      </div>

      {isGenerating ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Генерую повідомлення...
        </div>
      ) : (
        <>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="text-sm resize-none"
            placeholder="Текст повідомлення..."
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isSending || !message.trim()}
              className={activeDecision === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={activeDecision === 'rejected' ? 'destructive' : 'default'}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Надсилаю...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  Надіслати
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function TestTaskTimeline({ candidate }: TestTaskTimelineProps) {
  const [status, setStatus] = useState(candidate.test_task_status || 'not_sent');

  if (status === 'not_sent') {
    return null;
  }

  const isOverdue = candidate.test_task_current_deadline
    && new Date(candidate.test_task_current_deadline) < new Date()
    && !candidate.test_task_submitted_at;

  const canDecide = candidate.test_task_ai_score != null
    && !['approved', 'rejected', 'not_sent', 'scheduled', 'sent'].includes(status);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Тестове завдання
        </CardTitle>
        <Badge className={statusColors[status] || 'bg-gray-100 text-gray-700'}>
          {statusLabels[status] || status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline */}
        <div className="space-y-3">
          {/* Sent */}
          {candidate.test_task_sent_at && (
            <div className="flex items-start gap-3">
              <Send className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Надіслано</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(candidate.test_task_sent_at)} ({timeAgo(candidate.test_task_sent_at)})
                </p>
              </div>
            </div>
          )}

          {/* Deadline */}
          {candidate.test_task_current_deadline && (
            <div className="flex items-start gap-3">
              <Clock className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {candidate.test_task_submitted_at ? 'Дедлайн був' : 'Дедлайн'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(candidate.test_task_current_deadline)}
                </p>

                {(candidate.test_task_extensions_count || 0) > 0 && candidate.test_task_original_deadline && (
                  <p className="text-xs text-orange-600 mt-1">
                    Продовжено {candidate.test_task_extensions_count} раз(и) з{' '}
                    {new Date(candidate.test_task_original_deadline).toLocaleDateString('uk-UA')}
                  </p>
                )}

                {isOverdue && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle className="w-3 h-3" />
                    Прострочено на{' '}
                    {Math.floor((Date.now() - new Date(candidate.test_task_current_deadline).getTime()) / (1000 * 60 * 60))} год.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submitted */}
          {candidate.test_task_submitted_at && (
            <div className="flex items-start gap-3">
              <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                candidate.test_task_late_by_hours ? 'text-orange-600' : 'text-green-600'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium">Здано</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(candidate.test_task_submitted_at)}
                </p>

                {candidate.test_task_late_by_hours && candidate.test_task_late_by_hours > 0 && (
                  <div className="mt-1 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Здано із запізненням на {candidate.test_task_late_by_hours} год.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submission preview */}
        {candidate.test_task_submission_text && (
          <SubmissionPreview text={candidate.test_task_submission_text} />
        )}

        {/* AI Evaluation */}
        {candidate.test_task_ai_score != null && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-1">
                <Star className="w-4 h-4 text-primary" />
                AI Оцінка
              </h4>
              <span className={`text-lg font-bold ${
                candidate.test_task_ai_score >= 8 ? 'text-green-600' :
                candidate.test_task_ai_score >= 6 ? 'text-blue-600' :
                candidate.test_task_ai_score >= 4 ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {candidate.test_task_ai_score}/10
              </span>
            </div>
            {candidate.test_task_ai_evaluation && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {candidate.test_task_ai_evaluation}
              </div>
            )}
          </div>
        )}

        {/* Candidate Feedback */}
        {candidate.test_task_candidate_feedback && (
          <div className="pt-3 border-t">
            <h4 className="text-sm font-semibold mb-1">Фідбек кандидата</h4>
            <p className="text-sm text-muted-foreground italic">
              &quot;{candidate.test_task_candidate_feedback}&quot;
            </p>
          </div>
        )}

        {/* Decision Panel */}
        {canDecide && (
          <DecisionPanel
            candidateId={candidate.id}
            onDecided={(decision) => setStatus(decision)}
          />
        )}
      </CardContent>
    </Card>
  );
}
