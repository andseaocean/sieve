import { Candidate, Request } from '@/lib/supabase/types';

export const CANDIDATE_ANALYSIS_PROMPT = (candidate: Candidate, request: Request, resumeFormatted?: string) => `
You are an expert HR analyst for Vamos, an AI-first company.

Analyze this candidate application against the hiring request criteria and provide a detailed assessment.

HIRING REQUEST CRITERIA:
Title: ${request.title}
Required Skills: ${request.required_skills}
Nice-to-Have Skills: ${request.nice_to_have_skills || 'None specified'}
Soft Skills: ${request.soft_skills}
AI Orientation: ${request.ai_orientation || 'Not specified'}
Red Flags to Watch For: ${request.red_flags || 'None specified'}

CANDIDATE DATA:
Name: ${candidate.first_name} ${candidate.last_name}
About: ${candidate.about_text || 'Not provided'}
Why Vamos: ${candidate.why_vamos || 'Not provided'}
Skills: ${candidate.key_skills?.join(', ') || 'Not provided'}
LinkedIn: ${candidate.linkedin_url || 'Not provided'}
Portfolio: ${candidate.portfolio_url || 'Not provided'}

${resumeFormatted ? `\nRESUME DATA:\n${resumeFormatted}\n` : ''}

EVALUATION CRITERIA:
1. Overall Score (1-10):
   - 1-3: Not a fit (clear mismatch, red flags present)
   - 4-6: Potential (some fit, needs development)
   - 7-8: Strong match (good fit, minor gaps)
   - 9-10: Top tier (excellent fit, immediate consideration)

2. Category: top_tier / strong / potential / not_fit

3. Brief Summary (2-3 sentences maximum)

4. Key Strengths (bullet points, max 5)

5. Concerns or Gaps (if any, bullet points, max 3)

6. Recommendation: Should we contact this candidate? (Yes/No and why)

IMPORTANT:
- Be objective and fair
- Consider both hard skills and soft skills
- Pay attention to red flags
- Evaluate AI orientation based on the request priority
- Look for genuine motivation in "Why Vamos"

Return your analysis as a JSON object with this structure:
{
  "score": number (1-10),
  "category": "top_tier" | "strong" | "potential" | "not_fit",
  "summary": "string (2-3 sentences)",
  "strengths": ["string", "string", ...],
  "concerns": ["string", "string", ...],
  "recommendation": "yes" | "no",
  "reasoning": "string (why this recommendation)"
}
`;

export const MATCH_CANDIDATE_TO_REQUEST_PROMPT = (
  candidate: Candidate,
  candidateAnalysis: {
    score: number;
    category: string;
    summary: string;
    strengths: string[];
  },
  request: Request
) => `
You are matching a candidate to a specific hiring request.

CANDIDATE PROFILE:
Name: ${candidate.first_name} ${candidate.last_name}
AI Score: ${candidateAnalysis.score}/10
Category: ${candidateAnalysis.category}
Summary: ${candidateAnalysis.summary}
Strengths: ${candidateAnalysis.strengths.join(', ')}
Skills: ${candidate.key_skills?.join(', ') || 'Not provided'}

REQUEST REQUIREMENTS:
Title: ${request.title}
Required Skills: ${request.required_skills}
Nice-to-Have Skills: ${request.nice_to_have_skills || 'None'}
Soft Skills: ${request.soft_skills}
AI Orientation: ${request.ai_orientation || 'Not specified'}
Priority: ${request.priority}

Calculate a match score (0-100) based on:
- How well required skills align (40%)
- How well nice-to-have skills align (20%)
- Soft skills fit (20%)
- AI orientation alignment (10%)
- Overall quality of candidate (10%)

Return JSON with this structure:
{
  "match_score": number (0-100),
  "alignment": "string (how they match requirements)",
  "missing": "string (what's not aligned)",
  "recommendation": "strong_match" | "moderate_match" | "weak_match"
}
`;

// Job description generation
export const GENERATE_JOB_DESCRIPTION_PROMPT = (data: {
  title: string;
  required_skills: string;
  nice_to_have_skills?: string;
  soft_skills?: string;
  description?: string;
  location?: string;
  employment_type?: string;
  remote_policy?: string;
  ai_orientation?: string;
  red_flags?: string;
}) => `
You are a professional recruiter at Vamos, an AI-first company.
Generate a compelling job posting in Ukrainian based on the following criteria.

Job Title: ${data.title}
Required Skills: ${data.required_skills}
Nice-to-have Skills: ${data.nice_to_have_skills || 'None specified'}
Soft Skills: ${data.soft_skills || 'None specified'}
Role Description: ${data.description || 'None specified'}
Location: ${data.location || 'Not specified'}
Employment Type: ${data.employment_type || 'Not specified'}
Remote Policy: ${data.remote_policy || 'Not specified'}
AI Orientation: ${data.ai_orientation || 'Not specified'}
Red Flags to avoid: ${data.red_flags || 'None specified'}

Generate a professional job posting with the following structure:
1. **Eye-catching title** with role name
2. **About Vamos** (2-3 sentences) - emphasize AI-first approach
3. **What you'll do** (3-5 bullet points based on responsibilities/description)
4. **What we're looking for** (required skills formatted as bullets)
5. **Nice to have** (if provided)
6. **What we offer** (standard Vamos benefits - flexible schedule, remote-first, growth opportunities, modern tech stack)
7. **How to apply** - brief call to action

Tone: Professional but friendly, modern, tech-focused.
Length: 300-500 words.
Format: Use markdown for headers (**bold**) and bullets (•).
Language: Ukrainian.

Do not mention red flags or negative criteria in the posting.
Focus on opportunities and growth, not just requirements.
Return ONLY the job posting text, no additional comments or explanations.
`;

// General candidate analysis without a specific request (with optional resume data)
export const GENERAL_CANDIDATE_ANALYSIS_PROMPT = (candidate: Candidate, resumeFormatted?: string) => `
You are an expert HR analyst for Vamos, an AI-first company.

Analyze this candidate profile and provide a general assessment of their potential fit for a tech company.

CANDIDATE DATA:
Name: ${candidate.first_name} ${candidate.last_name}
About: ${candidate.about_text || 'Not provided'}
Why Vamos: ${candidate.why_vamos || 'Not provided'}
Skills: ${candidate.key_skills?.join(', ') || 'Not provided'}
LinkedIn: ${candidate.linkedin_url || 'Not provided'}
Portfolio: ${candidate.portfolio_url || 'Not provided'}

${resumeFormatted ? `\nRESUME DATA:\n${resumeFormatted}\n` : ''}

EVALUATION CRITERIA:
1. Overall Score (1-10):
   - 1-3: Not recommended (lacks key skills or red flags)
   - 4-6: Potential (could fit certain roles)
   - 7-8: Strong candidate (good fit for multiple roles)
   - 9-10: Top tier (exceptional candidate)

2. Category: top_tier / strong / potential / not_fit

3. Brief Summary (2-3 sentences about the candidate)

4. Key Strengths (bullet points, max 5)

5. Concerns or Gaps (if any, bullet points, max 3)

6. Best Fit Roles: What types of positions would this candidate be best suited for?

7. Recommendation: Should we pursue this candidate? (Yes/No and why)

IMPORTANT:
- Be objective and fair
- Consider both technical and soft skills
- Evaluate AI literacy and orientation to modern tools
- Look for genuine motivation and cultural fit potential${resumeFormatted ? `
- Use resume data (work experience, skills, education) to enrich your assessment
- Relevant work experience from resume should positively influence the score
- Technical skills from resume that match common tech company needs are a plus` : ''}

Return your analysis as a JSON object with this structure:
{
  "score": number (1-10),
  "category": "top_tier" | "strong" | "potential" | "not_fit",
  "summary": "string (2-3 sentences)",
  "strengths": ["string", "string", ...],
  "concerns": ["string", "string", ...],
  "best_fit_roles": ["string", "string", ...],
  "recommendation": "yes" | "no",
  "reasoning": "string (why this recommendation)"
}
`;
