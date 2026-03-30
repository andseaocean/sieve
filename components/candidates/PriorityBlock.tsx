'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Candidate, QuestionnaireStatus } from '@/lib/supabase/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { QuestionnaireSection } from '@/components/dashboard/questionnaire/questionnaire-section';
import { TestTaskTimeline } from '@/components/dashboard/test-task/TestTaskTimeline';

interface PriorityBlockProps {
  candidate: Candidate;
  pipelineStage: string;
  questionnaireCompleted: boolean;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
}

export function PriorityBlock({
  candidate,
  pipelineStage,
  questionnaireCompleted,
  onRunAnalysis,
  isAnalyzing,
}: PriorityBlockProps) {
  // Determine what to show
  switch (pipelineStage) {
    case 'new':
      return (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              Новий кандидат
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Кандидат ще не проаналізований. Запустіть AI аналіз для визначення оцінки та рекомендацій.
            </p>
            <Button onClick={onRunAnalysis} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isAnalyzing ? 'Аналіз...' : 'Запустити AI аналіз'}
            </Button>
          </CardContent>
        </Card>
      );

    case 'analyzed':
      return (
        <Card className="border-2 border-yellow-400/30 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <Sparkles className="h-5 w-5" />
              Очікує аутрічу
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidate.ai_score ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">{candidate.ai_score}/10</span>
                {candidate.ai_category && (
                  <Badge variant="outline">
                    {candidate.ai_category === 'top_tier' ? 'Топ' :
                     candidate.ai_category === 'strong' ? 'Сильний' :
                     candidate.ai_category === 'potential' ? 'Потенційний' : 'Не підходить'}
                  </Badge>
                )}
              </div>
            ) : null}
            {candidate.ai_summary && (
              <p className="text-sm text-muted-foreground">{candidate.ai_summary}</p>
            )}
            <p className="text-sm font-medium text-yellow-700">
              👇 Надішліть аутріч-повідомлення кандидату через блок нижче
            </p>
          </CardContent>
        </Card>
      );

    case 'outreach_sent':
      return (
        <Card className="border-2 border-blue-400/30 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              📨 Аутріч надіслано
            </CardTitle>
          </CardHeader>
          <CardContent>
            {candidate.outreach_message ? (
              <div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
                  {candidate.outreach_message}
                </p>
                {candidate.outreach_sent_at && (
                  <p className="text-xs text-muted-foreground">
                    Надіслано: {formatDateTime(candidate.outreach_sent_at)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Повідомлення надіслано кандидату. Очікуємо відповіді.
                {candidate.outreach_sent_at && (
                  <span className="block text-xs mt-1">
                    Надіслано: {formatDateTime(candidate.outreach_sent_at)}
                  </span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      );

    case 'questionnaire_sent':
      return (
        <Card className="border-2 border-orange-400/30 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              📝 Анкета в процесі
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Кандидат зараз заповнює анкету. Очікуємо завершення.
            </p>
          </CardContent>
        </Card>
      );

    case 'questionnaire_done':
      return (
        <div className="space-y-4">
          <Card className="border-2 border-green-400/30 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                ✅ Анкету заповнено
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Кандидат заповнив анкету. Перегляньте результати та надішліть тестове завдання.
              </p>
            </CardContent>
          </Card>
          <QuestionnaireSection
            candidateId={candidate.id}
            questionnaireStatus={(candidate as Record<string, unknown>).questionnaire_status as QuestionnaireStatus | null}
          />
        </div>
      );

    case 'test_sent':
      return (
        <TestTaskTimeline
          candidate={candidate}
          questionnaireCompleted={questionnaireCompleted}
        />
      );

    case 'test_done':
      return (
        <TestTaskTimeline
          candidate={candidate}
          questionnaireCompleted={questionnaireCompleted}
        />
      );

    case 'interview':
      return (
        <Card className="border-2 border-green-500/30 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-semibold text-green-700">Запрошено на інтерв&apos;ю</p>
              <p className="text-sm text-muted-foreground mt-1">
                Кандидат прийняв запрошення
              </p>
            </div>
          </CardContent>
        </Card>
      );

    case 'hired':
      return (
        <Card className="border-2 border-emerald-500/30 bg-emerald-50/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="font-semibold text-emerald-700">Найнято!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Кандидат успішно найнятий
              </p>
            </div>
          </CardContent>
        </Card>
      );

    case 'rejected':
    case 'outreach_declined':
      // Show AI analysis as reference
      if (!candidate.ai_score) return null;
      return (
        <Card className="border-2 border-gray-300/50 bg-gray-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground text-base">
              <Sparkles className="h-4 w-4" />
              AI-аналіз (довідково)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-muted-foreground">{candidate.ai_score}/10</span>
              {candidate.ai_category && (
                <Badge variant="outline" className="text-muted-foreground">
                  {candidate.ai_category === 'top_tier' ? 'Топ' :
                   candidate.ai_category === 'strong' ? 'Сильний' :
                   candidate.ai_category === 'potential' ? 'Потенційний' : 'Не підходить'}
                </Badge>
              )}
            </div>
            {candidate.ai_summary && (
              <p className="text-sm text-muted-foreground">{candidate.ai_summary}</p>
            )}
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}

// Helper: which blocks are "absorbed" by PriorityBlock (should not render separately below)
export function getPriorityAbsorbedBlocks(pipelineStage: string): string[] {
  switch (pipelineStage) {
    case 'questionnaire_done':
      return ['questionnaire'];
    case 'test_sent':
    case 'test_done':
      return ['test-task'];
    default:
      return [];
  }
}
