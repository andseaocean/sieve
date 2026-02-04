import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AIAnalysisResult {
  score: number;
  category: 'top_tier' | 'strong' | 'potential' | 'not_fit';
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendation: 'yes' | 'no';
  reasoning: string;
}

export interface AIMatchResult {
  match_score: number;
  alignment: string;
  missing: string;
  recommendation: 'strong_match' | 'moderate_match' | 'weak_match';
}

export async function analyzeWithClaude(prompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text from the response
  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  return textContent.text;
}

export function parseAIAnalysisResult(response: string): AIAnalysisResult {
  // Try to extract JSON from the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: parsed.score,
      category: parsed.category,
      summary: parsed.summary,
      strengths: parsed.strengths || [],
      concerns: parsed.concerns || [],
      recommendation: parsed.recommendation,
      reasoning: parsed.reasoning,
    };
  } catch {
    throw new Error('Failed to parse AI analysis result');
  }
}

export function parseAIMatchResult(response: string): AIMatchResult {
  // Try to extract JSON from the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      match_score: parsed.match_score,
      alignment: parsed.alignment,
      missing: parsed.missing,
      recommendation: parsed.recommendation,
    };
  } catch {
    throw new Error('Failed to parse AI match result');
  }
}

// Mock responses for development/testing
export const MOCK_ANALYSIS_RESULT: AIAnalysisResult = {
  score: 8.5,
  category: 'strong',
  summary: 'Mock analysis for testing. This candidate shows strong potential.',
  strengths: ['Good technical skills', 'Strong communication', 'Relevant experience'],
  concerns: ['Could improve in specific area'],
  recommendation: 'yes',
  reasoning: 'Overall a good fit for the role based on skills and experience.',
};

export const MOCK_MATCH_RESULT: AIMatchResult = {
  match_score: 75,
  alignment: 'Good alignment with required skills and experience',
  missing: 'Some nice-to-have skills are not present',
  recommendation: 'moderate_match',
};
