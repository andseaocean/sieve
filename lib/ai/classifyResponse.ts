/**
 * AI Response Classification
 *
 * Classifies candidate messages to determine intent and next action.
 */

import { analyzeWithClaude } from '@/lib/ai/claude';

export type ResponseCategory =
  | 'positive_ready'
  | 'positive_with_questions'
  | 'request_deadline_extension'
  | 'questions_about_job'
  | 'negative'
  | 'unclear'
  | 'test_task_submission';

export interface ClassificationResult {
  category: ResponseCategory;
  confidence: number;
  extracted_info: {
    requested_deadline_date?: string;
    requested_extension_days?: number;
    questions?: string[];
  };
}

export async function classifyResponse(
  responseText: string,
  context: {
    hasReceivedTestTask: boolean;
    testTaskDeadline?: Date;
  }
): Promise<ClassificationResult> {
  const prompt = `You are analyzing a candidate's response in a hiring conversation.

Context:
- Has candidate received test task yet? ${context.hasReceivedTestTask ? 'YES' : 'NO'}
${context.testTaskDeadline ? `- Current test task deadline: ${context.testTaskDeadline.toISOString()}` : ''}
- Current date: ${new Date().toISOString()}

Candidate's message:
"""
${responseText}
"""

Classify this message into ONE category:

1. **positive_ready** - Clear agreement to proceed with test task
   Examples: "Yes!", "I'm interested", "Send me the task", "Let's do it", "Готовий", "Давайте", "Так"

2. **positive_with_questions** - Interested but has questions first
   Examples: "Sounds good, but what's the salary?", "Yes, can you tell me more about the role?", "Цікаво, а графік який?"

3. **request_deadline_extension** - Asking for more time (ONLY if test task already sent)
   Examples: "Can I submit it by Friday instead?", "I need 2 more days", "Чи можна до четверга?"

4. **questions_about_job** - Asking about role, company, conditions (before test task)
   Examples: "What's the salary range?", "Is it remote?", "Розкажіть більше про проєкт"

5. **negative** - Not interested or declining
   Examples: "No thanks", "Not looking right now", "Already found a job", "Не цікавить"

6. **test_task_submission** - This message IS the test task submission
   Examples: Long text with solution, "Here's my solution:", "Ось моє рішення"

7. **unclear** - Ambiguous or off-topic

IMPORTANT:
- If candidate has NOT received test task yet, "request_deadline_extension" is IMPOSSIBLE
- If message is clearly a detailed solution/answer, classify as "test_task_submission"

Return JSON only:
{
  "category": "positive_ready",
  "confidence": 0.95,
  "extracted_info": {
    "requested_deadline_date": null,
    "requested_extension_days": null,
    "questions": []
  }
}`;

  const response = await analyzeWithClaude(prompt);

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      category: 'unclear',
      confidence: 0.5,
      extracted_info: {},
    };
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      category: 'unclear',
      confidence: 0.5,
      extracted_info: {},
    };
  }
}
