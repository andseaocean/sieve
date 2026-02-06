/**
 * Parse Deadline Extension Requests
 *
 * Uses AI to parse natural language deadline extension requests.
 */

import { analyzeWithClaude } from '@/lib/ai/claude';

export interface DeadlineExtension {
  requestedDate?: Date;
  additionalDays?: number;
  isReasonable: boolean;
  reason?: string;
}

export async function parseDeadlineRequest(
  messageText: string,
  currentDeadline: Date
): Promise<DeadlineExtension> {
  const now = new Date();

  const prompt = `You are parsing a deadline extension request in Ukrainian or English.

Current deadline: ${currentDeadline.toISOString()}
Current date: ${now.toISOString()}

Candidate's message:
"""
${messageText}
"""

Parse this message and extract:
1. What new deadline are they requesting?
2. How many additional days from CURRENT deadline?
3. Is this reasonable? (extension of 7 days or less = reasonable)

Handle various formats:
- "до четверга" (until Thursday) - calculate from current date
- "ще 3 дні" (3 more days) - add to current deadline
- "до 15 лютого" (until Feb 15) - specific date
- "до кінця тижня" (end of week) - until nearest Sunday
- "можна до понеділка?" (can it be Monday?) - next Monday

Return JSON only:
{
  "requestedDate": "2026-02-12T18:00:00Z",
  "additionalDays": 3,
  "isReasonable": true,
  "reason": "Candidate requested 3 more days until Thursday"
}

If you cannot parse the request, return:
{
  "isReasonable": false,
  "reason": "Could not understand deadline request"
}`;

  const response = await analyzeWithClaude(prompt);

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      isReasonable: false,
      reason: 'Could not parse deadline request',
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      requestedDate: parsed.requestedDate ? new Date(parsed.requestedDate) : undefined,
      additionalDays: parsed.additionalDays,
      isReasonable: parsed.isReasonable,
      reason: parsed.reason,
    };
  } catch {
    return {
      isReasonable: false,
      reason: 'Could not parse deadline request',
    };
  }
}
