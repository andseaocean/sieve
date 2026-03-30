'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { Candidate, QuestionnaireResponse, QuestionnaireAIEvaluation } from '@/lib/supabase/types';
import { getScoreColor } from '@/lib/utils';

interface AIPortraitTabProps {
  candidate: Candidate;
  questionnaireResponse?: QuestionnaireResponse | null;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 7 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className={`text-sm font-semibold ${score >= 7 ? 'text-green-600' : score >= 4 ? 'text-yellow-600' : 'text-red-600'}`}>
        {score}/10
      </span>
    </div>
  );
}

export function AIPortraitTab({ candidate, questionnaireResponse }: AIPortraitTabProps) {
  const evaluation = questionnaireResponse?.ai_evaluation as QuestionnaireAIEvaluation | null | undefined;

  return (
    <div className="space-y-6">
      {/* Block 1: Application analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Аналіз заявки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidate.ai_score ? (
            <>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(candidate.ai_score)}`}>
                    {candidate.ai_score}
                  </div>
                  <div className="text-xs text-muted-foreground">AI Score</div>
                </div>
                {candidate.ai_category && (
                  <Badge variant="outline" className="text-sm">
                    {candidate.ai_category === 'top_tier' ? 'Топ кандидат' :
                     candidate.ai_category === 'strong' ? 'Сильний' :
                     candidate.ai_category === 'potential' ? 'Потенційний' : 'Не підходить'}
                  </Badge>
                )}
                {candidate.ai_recommendation && (
                  <Badge variant={candidate.ai_recommendation === 'yes' ? 'default' : 'destructive'}>
                    {candidate.ai_recommendation === 'yes' ? '✓ Рекомендовано' : '✗ Не рекомендовано'}
                  </Badge>
                )}
              </div>

              {candidate.ai_summary && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Резюме</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.ai_summary}</p>
                </div>
              )}

              {candidate.ai_strengths && candidate.ai_strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-2">💪 Сильні сторони</h4>
                  <ul className="text-sm space-y-1">
                    {candidate.ai_strengths.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {candidate.ai_concerns && candidate.ai_concerns.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-amber-700 mb-2">⚠️ Зони для уваги</h4>
                  <ul className="text-sm space-y-1">
                    {candidate.ai_concerns.map((c: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {candidate.ai_reasoning && (
                <div className="pt-2 border-t">
                  <h4 className="text-sm font-semibold mb-1">📝 Обґрунтування</h4>
                  <p className="text-sm text-muted-foreground">{candidate.ai_reasoning}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">Аналіз ще не виконано</p>
          )}
        </CardContent>
      </Card>

      {/* Block 2: Questionnaire evaluation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📝</span>
            Оцінка анкети
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questionnaireResponse && evaluation ? (
            <>
              {evaluation.summary && (
                <div className="pb-2 border-b">
                  <p className="text-sm text-muted-foreground">{evaluation.summary}</p>
                </div>
              )}

              {questionnaireResponse.ai_score != null && (
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(questionnaireResponse.ai_score)}`}>
                      {questionnaireResponse.ai_score}
                    </div>
                    <div className="text-xs text-muted-foreground">Загальний бал</div>
                  </div>
                </div>
              )}

              {evaluation.per_competency && evaluation.per_competency.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">Компетенції</h4>
                  <div className="space-y-3">
                    {evaluation.per_competency.map((comp, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{comp.competency_name}</span>
                        </div>
                        <ScoreBar score={comp.score} />
                        {comp.comment && (
                          <p className="text-xs text-muted-foreground mt-1">{comp.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {evaluation.strengths && evaluation.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-2">💪 Сильні сторони</h4>
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

              {evaluation.concerns && evaluation.concerns.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-amber-700 mb-2">⚠️ Зони для уваги</h4>
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
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">Анкету ще не заповнено</p>
          )}
        </CardContent>
      </Card>

      {/* Block 3: Test task evaluation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📋</span>
            Оцінка тестового
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidate.test_task_ai_score != null ? (
            <>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(candidate.test_task_ai_score)}`}>
                    {candidate.test_task_ai_score}
                  </div>
                  <div className="text-xs text-muted-foreground">AI Score</div>
                </div>
              </div>
              {candidate.test_task_ai_evaluation && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Деталі оцінки</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {candidate.test_task_ai_evaluation}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">Тестове ще не перевірено</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
