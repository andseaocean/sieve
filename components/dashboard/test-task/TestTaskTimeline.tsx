'use client';

import { Clock, CheckCircle, AlertTriangle, FileText, Send, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TestTaskTimelineProps {
  candidate: {
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
};

const statusColors: Record<string, string> = {
  not_sent: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sent: 'bg-yellow-100 text-yellow-700',
  submitted_on_time: 'bg-green-100 text-green-700',
  submitted_late: 'bg-orange-100 text-orange-700',
  evaluating: 'bg-purple-100 text-purple-700',
  evaluated: 'bg-emerald-100 text-emerald-700',
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

export function TestTaskTimeline({ candidate }: TestTaskTimelineProps) {
  const status = candidate.test_task_status || 'not_sent';

  if (status === 'not_sent') {
    return null;
  }

  const isOverdue = candidate.test_task_current_deadline
    && new Date(candidate.test_task_current_deadline) < new Date()
    && !candidate.test_task_submitted_at;

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
          <div className="pt-3 border-t">
            <h4 className="text-sm font-semibold mb-2">Відповідь кандидата</h4>
            <div className="bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
              {candidate.test_task_submission_text.length > 500
                ? candidate.test_task_submission_text.substring(0, 500) + '...'
                : candidate.test_task_submission_text}
            </div>
          </div>
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
      </CardContent>
    </Card>
  );
}
