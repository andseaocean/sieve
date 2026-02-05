/**
 * Outreach Message Generator
 *
 * Generates personalized introduction and test task messages for warm candidates.
 * Uses Claude AI for message generation with fallback to mock messages in development.
 */

import { analyzeWithClaude } from '@/lib/ai/claude';
import { Candidate, Request } from '@/lib/supabase/types';
import {
  AIAnalysisResult,
  WARM_CANDIDATE_INTRO_PROMPT,
  TEST_TASK_MESSAGE_PROMPT,
  MOCK_INTRO_MESSAGE,
  MOCK_TEST_TASK_MESSAGE,
} from '@/lib/ai/outreach-prompts';

const USE_MOCK_AI = process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY;

interface GenerateIntroParams {
  candidate: Candidate;
  analysis: AIAnalysisResult;
  bestMatch?: {
    request: Request;
    match_score: number;
  };
}

/**
 * Generate personalized introduction message for a warm candidate
 */
export async function generateWarmIntroMessage(params: GenerateIntroParams): Promise<string> {
  const { candidate, analysis, bestMatch } = params;

  // Use mock in development if no API key
  if (USE_MOCK_AI) {
    console.log('Using mock intro message generator');
    return MOCK_INTRO_MESSAGE(candidate, bestMatch);
  }

  try {
    const prompt = WARM_CANDIDATE_INTRO_PROMPT(candidate, analysis, bestMatch);
    const response = await analyzeWithClaude(prompt);

    // Clean up the response
    const cleanedMessage = cleanAIResponse(response);

    // Validate message is not empty
    if (!cleanedMessage || cleanedMessage.length < 50) {
      console.warn('AI generated message too short, using mock');
      return MOCK_INTRO_MESSAGE(candidate, bestMatch);
    }

    return cleanedMessage;
  } catch (error) {
    console.error('Error generating intro message:', error);
    return MOCK_INTRO_MESSAGE(candidate, bestMatch);
  }
}

/**
 * Generate test task message for a candidate
 */
export async function generateTestTaskMessage(
  candidate: Candidate,
  request: Request,
  notionUrl: string
): Promise<string> {
  // Use mock in development if no API key
  if (USE_MOCK_AI) {
    console.log('Using mock test task message generator');
    return MOCK_TEST_TASK_MESSAGE(candidate, request, notionUrl);
  }

  try {
    const prompt = TEST_TASK_MESSAGE_PROMPT(candidate, request, notionUrl);
    const response = await analyzeWithClaude(prompt);

    // Clean up the response
    const cleanedMessage = cleanAIResponse(response);

    // Validate message is not empty
    if (!cleanedMessage || cleanedMessage.length < 30) {
      console.warn('AI generated test task message too short, using mock');
      return MOCK_TEST_TASK_MESSAGE(candidate, request, notionUrl);
    }

    return cleanedMessage;
  } catch (error) {
    console.error('Error generating test task message:', error);
    return MOCK_TEST_TASK_MESSAGE(candidate, request, notionUrl);
  }
}

/**
 * Clean up AI response by removing quotes, code blocks, and extra whitespace
 */
function cleanAIResponse(response: string): string {
  let cleaned = response;

  // Remove surrounding quotes
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // Remove any "assistant:" or similar prefixes
  cleaned = cleaned.replace(/^(assistant|ai|bot):\s*/i, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Create AIAnalysisResult from candidate data
 * Used when we need to generate a message but don't have the full analysis object
 */
export function createAnalysisResultFromCandidate(candidate: Candidate): AIAnalysisResult {
  return {
    score: candidate.ai_score || 7,
    category: candidate.ai_category || 'strong',
    summary: candidate.ai_summary || '',
    strengths: candidate.ai_strengths || [],
    concerns: candidate.ai_concerns || [],
  };
}
