import { analyzeWithClaude } from '@/lib/ai/claude';
import { BookmarkletProfile } from './evaluator';
import { AIAnalysisResult } from '@/lib/ai/claude';

const USE_MOCK_AI = process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY;

interface MessageGeneratorParams {
  profile: BookmarkletProfile;
  evaluation: AIAnalysisResult;
  bestMatch?: {
    request_title: string;
    match_score: number;
  };
  managerName?: string;
  tone?: 'formal' | 'friendly' | 'casual';
}

const OUTREACH_MESSAGE_PROMPT = (params: MessageGeneratorParams) => `
Generate a personalized outreach message for this candidate.

CANDIDATE:
Name: ${params.profile.name}
Platform: ${params.profile.platform}
Current Position: ${params.profile.position || params.profile.headline || 'Not specified'}
Key Skills: ${params.profile.skills?.slice(0, 5).join(', ') || 'Not specified'}
Location: ${params.profile.location || 'Not specified'}
About: ${params.profile.about || params.profile.bio || 'Not available'}

AI EVALUATION:
Score: ${params.evaluation.score}/10
Category: ${params.evaluation.category}
Summary: ${params.evaluation.summary}
Strengths: ${params.evaluation.strengths.join(', ')}

${params.bestMatch ? `
BEST MATCHING ROLE:
Position: ${params.bestMatch.request_title}
Match Score: ${params.bestMatch.match_score}/100
` : ''}

TONE: ${params.tone || 'friendly'}

Write a personalized ${params.profile.platform === 'linkedin' ? 'LinkedIn' : 'email'} message IN UKRAINIAN (УКРАЇНСЬКОЮ мовою):

REQUIREMENTS:
- Start with a personalized greeting using their first name
- Mention 1-2 specific things from their profile that impressed you
- Briefly explain why Vamos could be interesting for them
- ${params.bestMatch ? `Reference the ${params.bestMatch.request_title} role` : 'Mention we have opportunities that might interest them'}
- Keep it short (120-180 words max)
- ${params.tone === 'formal' ? 'Professional and formal tone' : params.tone === 'casual' ? 'Casual and conversational tone' : 'Professional but warm and friendly tone'}
- End with a soft call-to-action (asking if they'd be open to a chat)
- Sign off with the manager's name or "Vamos Team"
- The ENTIRE message must be in Ukrainian

DO NOT:
- Be too salesy or pushy
- Use generic phrases like "I came across your profile"
- Make it too long
- Promise anything specific
- Write in any language other than Ukrainian

Generate ONLY the message text, no explanations or meta-commentary.
`;

function getFirstName(name: string): string {
  return name.split(' ')[0] || name;
}

const MOCK_OUTREACH_MESSAGE = (profile: BookmarkletProfile, bestMatch?: { request_title: string }) => `
Привіт ${getFirstName(profile.name)}!

Звернув увагу на твій профіль на ${profile.platform === 'github' ? 'GitHub' : profile.platform === 'linkedin' ? 'LinkedIn' : profile.platform.toUpperCase()} і хотів би поділитися цікавою можливістю.

${profile.skills && profile.skills.length > 0 ? `Твій досвід з ${profile.skills.slice(0, 2).join(' та ')} виглядає дуже цікаво.` : 'Твій професійний досвід виглядає дуже цікаво.'}

У Vamos ми будуємо AI-first компанію, де технології та інновації - це не просто слова, а щоденна практика. ${bestMatch ? `Зараз шукаємо ${bestMatch.request_title}, і твій профіль виглядає як чудовий match.` : 'Думаю, що твої навички могли б чудово доповнити нашу команду.'}

Чи був би ти відкритий до короткої розмови, щоб дізнатися більше? Обіцяю, це буде неформально і без жодних зобов'язань.

З повагою,
Команда Vamos
`;

export async function generateOutreachMessage(params: MessageGeneratorParams): Promise<string> {
  if (USE_MOCK_AI) {
    console.log('Using mock outreach message generator');
    return MOCK_OUTREACH_MESSAGE(params.profile, params.bestMatch);
  }

  try {
    const prompt = OUTREACH_MESSAGE_PROMPT(params);
    const message = await analyzeWithClaude(prompt);

    // Clean up the message - remove any quotes or markdown
    return message
      .replace(/^["']|["']$/g, '')
      .replace(/^```[\s\S]*?```$/gm, '')
      .trim();
  } catch (error) {
    console.error('Error generating outreach message:', error);
    // Return a fallback message
    return MOCK_OUTREACH_MESSAGE(params.profile, params.bestMatch);
  }
}

export async function regenerateMessage(params: MessageGeneratorParams): Promise<string> {
  // Add slight variation to the prompt for regeneration
  const modifiedParams = {
    ...params,
    tone: params.tone || (['formal', 'friendly', 'casual'] as const)[Math.floor(Math.random() * 3)],
  };

  return generateOutreachMessage(modifiedParams);
}
