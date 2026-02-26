/**
 * AI Questionnaire Evaluation
 *
 * Evaluates candidate soft skills questionnaire responses using AI.
 */

import { analyzeWithClaude } from '@/lib/ai/claude';
import type { QuestionnaireAIEvaluation, QuestionnaireQuestionSnapshot } from '@/lib/supabase/types';

export interface QuestionnaireEvaluationResult {
  score: number;
  evaluation: QuestionnaireAIEvaluation;
}

export async function evaluateQuestionnaire(params: {
  questions: QuestionnaireQuestionSnapshot[];
  answers: Record<string, string>;
  requestTitle: string;
  requestDescription: string;
}): Promise<QuestionnaireEvaluationResult> {
  const { questions, answers, requestTitle, requestDescription } = params;

  // Build questions with answers block
  const questionsBlock = questions.map(q => {
    const answer = answers[q.question_id] || '(не надано)';
    return `[${q.competency_name}] Питання: ${q.text}\nВідповідь кандидата: ${answer}`;
  }).join('\n\n');

  // Get unique competencies for per_competency evaluation
  const uniqueCompetencies = [...new Map(
    questions.map(q => [q.competency_id, { id: q.competency_id, name: q.competency_name }])
  ).values()];

  const prompt = `Ти — експерт з оцінки soft skills кандидатів. Оціни відповіді кандидата на анкету для позиції "${requestTitle}".

${requestDescription ? `Опис позиції: ${requestDescription}` : ''}

ВІДПОВІДІ КАНДИДАТА:
${questionsBlock}

КРИТЕРІЇ ОЦІНКИ кожної відповіді:
- Конкретність: чи є реальні приклади з досвіду, чи загальні фрази?
- Рефлексія: чи розуміє людина власні дії та їх наслідки?
- Автентичність: чи відчувається щирість (специфічні деталі, незручні моменти)?
- Відповідність компетенції: чи відповідь стосується того, про що питали?

ШКАЛА ОЦІНКИ:
- 1-4: Слабкі відповіді, загальні фрази, немає конкретики
- 5-6: Достатньо, але є питання
- 7-8: Хороші відповіді з конкретними прикладами
- 9-10: Виняткова глибина і рефлексія

Компетенції для оцінки:
${uniqueCompetencies.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

ALL text values in the response MUST be in Ukrainian (УКРАЇНСЬКОЮ мовою).

Поверни ТІЛЬКИ JSON:
{
  "score": 7,
  "summary": "Загальний висновок про кандидата (3-5 речень)",
  "strengths": ["Сильна сторона 1", "Сильна сторона 2"],
  "concerns": ["Зона уваги 1"],
  "recommendation": "Рекомендація щодо кандидата (1-2 речення)",
  "per_competency": [
    {
      "competency_id": "uuid-компетенції",
      "competency_name": "Назва компетенції",
      "score": 8,
      "comment": "Аналіз відповідей по цій компетенції"
    }
  ]
}`;

  const response = await analyzeWithClaude(prompt);

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from questionnaire evaluation response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    score: parsed.score,
    evaluation: {
      summary: parsed.summary,
      strengths: parsed.strengths,
      concerns: parsed.concerns,
      recommendation: parsed.recommendation,
      per_competency: parsed.per_competency,
    },
  };
}
