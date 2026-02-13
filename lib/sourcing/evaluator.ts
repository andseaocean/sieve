import { analyzeWithClaude, parseAIAnalysisResult, parseAIMatchResult, MOCK_ANALYSIS_RESULT, MOCK_MATCH_RESULT, AIAnalysisResult } from '@/lib/ai/claude';
import { createServerClient } from '@/lib/supabase/client';
import { Request } from '@/lib/supabase/types';

const USE_MOCK_AI = process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY;
console.log('[Evaluator] NODE_ENV:', process.env.NODE_ENV, 'ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY, 'USE_MOCK_AI:', USE_MOCK_AI);

// New type for bookmarklet-extracted profile data
export interface BookmarkletProfile {
  platform: 'linkedin' | 'dou' | 'djinni' | 'workua' | 'github';
  url: string;
  name: string;
  headline?: string;
  position?: string;
  bio?: string;
  location?: string;
  skills: string[];
  experiences?: Array<{ title: string; company: string }>;
  about?: string;
  experience_years?: number;
  english_level?: string;
  email?: string;
  phone?: string;
  username?: string;
  company?: string;
  website?: string;
  repo_count?: string;
  salary_expectations?: string;
  timestamp: string;
}

export interface RequestMatch {
  request_id: string;
  request_title: string;
  match_score: number;
  explanation: string;
  recommendation: 'strong_match' | 'moderate_match' | 'weak_match';
}

export interface EvaluationResult {
  evaluation: AIAnalysisResult;
  matches: RequestMatch[];
  best_match?: {
    request_id: string;
    request_title: string;
    match_score: number;
  };
}

function formatProfileForPrompt(profile: BookmarkletProfile): string {
  const lines: string[] = [];

  lines.push(`Name: ${profile.name}`);

  if (profile.headline) lines.push(`Headline: ${profile.headline}`);
  if (profile.position) lines.push(`Current Position: ${profile.position}`);
  if (profile.location) lines.push(`Location: ${profile.location}`);

  if (profile.skills && profile.skills.length > 0) {
    lines.push(`Skills: ${profile.skills.join(', ')}`);
  }

  if (profile.experience_years) {
    lines.push(`Experience: ${profile.experience_years} years`);
  }

  if (profile.experiences && profile.experiences.length > 0) {
    lines.push('Work History:');
    profile.experiences.forEach(exp => {
      lines.push(`  - ${exp.title} at ${exp.company}`);
    });
  }

  if (profile.english_level) lines.push(`English: ${profile.english_level}`);
  if (profile.about || profile.bio) lines.push(`About: ${profile.about || profile.bio}`);
  if (profile.salary_expectations) lines.push(`Salary Expectations: ${profile.salary_expectations}`);

  // GitHub specific
  if (profile.platform === 'github') {
    if (profile.username) lines.push(`GitHub Username: ${profile.username}`);
    if (profile.repo_count) lines.push(`Public Repositories: ${profile.repo_count}`);
    if (profile.company) lines.push(`Company: ${profile.company}`);
    if (profile.website) lines.push(`Website: ${profile.website}`);
  }

  return lines.join('\n');
}

const COLD_CANDIDATE_EVALUATION_PROMPT = (profile: BookmarkletProfile, activeRequests: Request[]) => `
You are an expert HR analyst evaluating a candidate profile found on ${profile.platform}.

CANDIDATE PROFILE:
${formatProfileForPrompt(profile)}

Profile URL: ${profile.url}

${activeRequests.length > 0 ? `
ACTIVE HIRING REQUESTS:
${activeRequests.map((r, i) => `
${i + 1}. ${r.title}
   Required Skills: ${r.required_skills}
   Nice-to-Have: ${r.nice_to_have_skills || 'None'}
   Soft Skills: ${r.soft_skills}
   AI Orientation: ${r.ai_orientation || 'Not specified'}
`).join('\n')}
` : 'No active hiring requests at the moment.'}

EVALUATION CRITERIA:
1. Overall Score (1-10):
   - 1-3: Not recommended (lacks key skills or red flags)
   - 4-6: Potential (could fit certain roles)
   - 7-8: Strong candidate (good fit for multiple roles)
   - 9-10: Top tier (exceptional candidate)

2. Category: top_tier / strong / potential / not_fit

3. Brief Summary (2-3 sentences about the candidate's profile)

4. Key Strengths (3-5 bullet points based on visible profile data)

5. Concerns or Gaps (if any, bullet points)

6. Recommendation: Should we reach out? (yes/no and why)

IMPORTANT:
- Be objective based only on available information
- Consider the platform source (${profile.platform}) - some platforms show limited data
- If limited information, note what would be helpful to know
- Focus on technical skills match with our active requests
- ALL text values in the response MUST be in Ukrainian (УКРАЇНСЬКОЮ мовою)

Return your analysis as a JSON object:
{
  "score": number (1-10),
  "category": "top_tier" | "strong" | "potential" | "not_fit",
  "summary": "string in Ukrainian",
  "strengths": ["string in Ukrainian", ...],
  "concerns": ["string in Ukrainian", ...],
  "recommendation": "yes" | "no",
  "reasoning": "string in Ukrainian"
}
`;

const MATCH_TO_REQUEST_PROMPT = (profile: BookmarkletProfile, request: Request) => `
Match this candidate profile to a specific job request.

CANDIDATE:
Name: ${profile.name}
Skills: ${profile.skills?.join(', ') || 'Not specified'}
Experience: ${profile.experience_years ? `${profile.experience_years} years` : 'Unknown'}
Current Position: ${profile.position || profile.headline || 'Unknown'}
Location: ${profile.location || 'Unknown'}

JOB REQUEST:
Title: ${request.title}
Required Skills: ${request.required_skills}
Nice-to-Have: ${request.nice_to_have_skills || 'None'}
Soft Skills: ${request.soft_skills}
AI Orientation: ${request.ai_orientation || 'Not specified'}

Calculate a match score (0-100) based on:
- Required skills alignment (50%)
- Nice-to-have skills (20%)
- Experience level fit (20%)
- Location/remote compatibility (10%)

ALL text values in the response MUST be in Ukrainian (УКРАЇНСЬКОЮ мовою).

Return JSON:
{
  "match_score": number (0-100),
  "alignment": "string in Ukrainian (what matches well)",
  "missing": "string in Ukrainian (what's missing or unknown)",
  "recommendation": "strong_match" | "moderate_match" | "weak_match"
}
`;

export async function evaluateColdCandidate(profile: BookmarkletProfile): Promise<EvaluationResult> {
  const supabase = createServerClient();

  // Get all active requests
  const { data: requestsData } = await supabase
    .from('requests')
    .select('*')
    .eq('status', 'active');

  const activeRequests = (requestsData || []) as Request[];

  let evaluation: AIAnalysisResult;

  if (USE_MOCK_AI) {
    console.log('Using mock AI evaluation for cold candidate');
    const position = profile.position || profile.headline || 'professional';
    const skillsDisplay = profile.skills?.slice(0, 3).join(', ') || 'various';
    evaluation = {
      ...MOCK_ANALYSIS_RESULT,
      summary: `${profile.name} is a ${position} with ${skillsDisplay} skills. Based on their ${profile.platform} profile, they show potential for technical roles.`,
    };
  } else {
    const prompt = COLD_CANDIDATE_EVALUATION_PROMPT(profile, activeRequests);
    const response = await analyzeWithClaude(prompt);
    evaluation = parseAIAnalysisResult(response);
  }

  // Calculate matches for each active request
  const matches: RequestMatch[] = [];

  for (const request of activeRequests) {
    let matchResult;

    if (USE_MOCK_AI) {
      matchResult = {
        ...MOCK_MATCH_RESULT,
        match_score: Math.floor(Math.random() * 40) + 50, // Random 50-90 for mock
      };
    } else {
      const matchPrompt = MATCH_TO_REQUEST_PROMPT(profile, request);
      const matchResponse = await analyzeWithClaude(matchPrompt);
      matchResult = parseAIMatchResult(matchResponse);
    }

    matches.push({
      request_id: request.id,
      request_title: request.title,
      match_score: matchResult.match_score,
      explanation: matchResult.alignment,
      recommendation: matchResult.recommendation,
    });
  }

  // Sort matches by score descending
  matches.sort((a, b) => b.match_score - a.match_score);

  // Find best match
  const best_match = matches.length > 0
    ? {
        request_id: matches[0].request_id,
        request_title: matches[0].request_title,
        match_score: matches[0].match_score,
      }
    : undefined;

  return {
    evaluation,
    matches,
    best_match,
  };
}
