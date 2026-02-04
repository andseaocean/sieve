'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AIAnalysisResult } from '@/lib/ai/claude';
import { RequestMatch } from '@/lib/sourcing/evaluator';
import {
  categoryColors,
  categoryLabels,
  getScoreColor,
  getMatchScoreColor,
  getMatchScoreBg,
} from '@/lib/utils';
import { Sparkles, CheckCircle2, AlertTriangle, Target } from 'lucide-react';

interface EvaluationCardProps {
  evaluation: AIAnalysisResult;
  matches: RequestMatch[];
  bestMatch?: {
    request_id: string;
    request_title: string;
    match_score: number;
  };
}

export function EvaluationCard({ evaluation, matches, bestMatch }: EvaluationCardProps) {
  const scorePercentage = (evaluation.score / 10) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Оцінка
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Загальна оцінка</span>
            <span className={`text-2xl font-bold ${getScoreColor(evaluation.score)}`}>
              {evaluation.score}/10
            </span>
          </div>
          <Progress value={scorePercentage} className="h-2" />
        </div>

        {/* Category */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Категорія</span>
          <Badge variant="outline" className={categoryColors[evaluation.category]}>
            {categoryLabels[evaluation.category]}
          </Badge>
        </div>

        {/* Summary */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Резюме</p>
          <p className="text-sm text-muted-foreground">{evaluation.summary}</p>
        </div>

        {/* Strengths */}
        {evaluation.strengths.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Сильні сторони
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {evaluation.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concerns */}
        {evaluation.concerns.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Можливі ризики
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {evaluation.concerns.map((concern, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-yellow-600 mt-0.5">•</span>
                  {concern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Best Match */}
        {bestMatch && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <Target className="h-4 w-4 text-primary" />
              Найкращий match
            </p>
            <div className={`p-3 rounded-lg ${getMatchScoreBg(bestMatch.match_score)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{bestMatch.request_title}</span>
                <span className={`font-bold ${getMatchScoreColor(bestMatch.match_score)}`}>
                  {bestMatch.match_score}/100
                </span>
              </div>
            </div>
          </div>
        )}

        {/* All Matches */}
        {matches.length > 1 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Всі matches</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {matches.map((match) => (
                <div
                  key={match.request_id}
                  className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                >
                  <span className="truncate flex-1 mr-2">{match.request_title}</span>
                  <Badge
                    variant="outline"
                    className={
                      match.recommendation === 'strong_match'
                        ? 'bg-green-50 text-green-700'
                        : match.recommendation === 'moderate_match'
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-gray-50 text-gray-700'
                    }
                  >
                    {match.match_score}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {matches.length === 0 && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground text-center">
              Немає активних запитів для порівняння
            </p>
          </div>
        )}

        {/* Recommendation */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2">
            <Badge
              variant={evaluation.recommendation === 'yes' ? 'default' : 'secondary'}
              className={
                evaluation.recommendation === 'yes'
                  ? 'bg-green-600 hover:bg-green-700'
                  : ''
              }
            >
              {evaluation.recommendation === 'yes' ? '✓ Рекомендовано' : '✗ Не рекомендовано'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{evaluation.reasoning}</p>
        </div>
      </CardContent>
    </Card>
  );
}
