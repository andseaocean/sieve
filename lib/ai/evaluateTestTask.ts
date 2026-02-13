/**
 * AI Test Task Evaluation
 *
 * Evaluates candidate test task submissions using AI.
 */

import { analyzeWithClaude } from '@/lib/ai/claude';

export interface EvaluationResult {
  score: number;
  evaluation: string;
  strengths: string[];
  improvements: string[];
}

export async function evaluateTestTask(
  submissionText: string,
  evaluationCriteria: string,
  testTaskDescription: string
): Promise<EvaluationResult> {
  const prompt = `You are evaluating a candidate's test task submission for a hiring process.

Test task description:
"""
${testTaskDescription}
"""

Evaluation criteria:
"""
${evaluationCriteria}
"""

Candidate's submission:
"""
${submissionText}
"""

Evaluate this submission and provide:
1. Score from 1-10 based on criteria
2. Detailed evaluation (3-5 sentences)
3. Key strengths (2-3 points)
4. Areas for improvement (1-2 points)

Scoring guide:
- 1-3: Does not meet requirements, major issues
- 4-5: Partially meets requirements, needs significant work
- 6-7: Meets requirements, solid work
- 8-9: Exceeds requirements, strong work
- 10: Exceptional, outstanding work

Be constructive and fair. Focus on what candidate DID, not what they didn't do.

ALL text values in the response MUST be in Ukrainian (УКРАЇНСЬКОЮ мовою).

Return JSON only:
{
  "score": 8,
  "evaluation": "Сильне рішення, яке демонструє...",
  "strengths": [
    "Чітке пояснення підходу",
    "Гарна структура коду"
  ],
  "improvements": [
    "Можна додати більше коментарів"
  ]
}`;

  const response = await analyzeWithClaude(prompt);

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from evaluation response');
  }

  return JSON.parse(jsonMatch[0]);
}
