import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { analyzeWithClaude, parseAIMatchResult, MOCK_MATCH_RESULT } from '@/lib/ai/claude';
import { MATCH_CANDIDATE_TO_REQUEST_PROMPT } from '@/lib/ai/prompts';
import { Candidate, Request } from '@/lib/supabase/types';

const USE_MOCK_AI = process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const internalSecret = process.env.INTERNAL_API_SECRET || 'default-secret';
  const isInternal = request.headers.get('x-internal-secret') === internalSecret;

  if (!isInternal) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: requestId } = await context.params;
  const supabase = createServiceRoleClient();

  // Fetch the request
  const { data: requestData, error: reqError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqError || !requestData) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const jobRequest = requestData as Request;

  // Fetch all candidates not rejected/hired
  const { data: candidatesData, error: candidatesError } = await supabase
    .from('candidates')
    .select('*')
    .not('pipeline_stage', 'in', '("rejected","hired")')
    .not('ai_score', 'is', null);

  if (candidatesError) {
    return NextResponse.json({ error: candidatesError.message }, { status: 500 });
  }

  const candidates = (candidatesData ?? []) as Candidate[];
  const results: Array<{
    candidate_id: string;
    candidate_name: string;
    match_score: number;
    primary_request_title: string | null;
    pipeline_stage: string;
    is_in_active_pipeline: boolean;
  }> = [];

  const ACTIVE_STAGES = ['outreach_sent', 'questionnaire_sent', 'questionnaire_done', 'test_sent', 'test_done', 'interview'];

  for (const candidate of candidates) {
    try {
      const analysis = {
        score: candidate.ai_score ?? 5,
        category: candidate.ai_category ?? 'potential',
        summary: candidate.ai_summary ?? '',
        strengths: (candidate.ai_strengths as string[]) ?? [],
      };

      let matchResult;
      if (USE_MOCK_AI) {
        matchResult = MOCK_MATCH_RESULT;
      } else {
        const matchPrompt = MATCH_CANDIDATE_TO_REQUEST_PROMPT(candidate, analysis, jobRequest);
        const matchResponse = await analyzeWithClaude(matchPrompt);
        matchResult = parseAIMatchResult(matchResponse);
      }

      // Upsert match
      const { data: existingMatchData } = await supabase
        .from('candidate_request_matches')
        .select('id')
        .eq('candidate_id', candidate.id)
        .eq('request_id', requestId)
        .single();

      const existingMatch = existingMatchData as { id: string } | null;

      if (existingMatch) {
        await supabase
          .from('candidate_request_matches')
          .update({
            match_score: matchResult.match_score,
            match_explanation: `${matchResult.alignment}\n\nMissing: ${matchResult.missing}`,
          } as never)
          .eq('id', existingMatch.id);
      } else {
        await supabase
          .from('candidate_request_matches')
          .insert({
            candidate_id: candidate.id,
            request_id: requestId,
            match_score: matchResult.match_score,
            match_explanation: `${matchResult.alignment}\n\nMissing: ${matchResult.missing}`,
            status: 'new',
          } as never);
      }

      if (matchResult.match_score >= 70) {
        // Fetch current primary request title if exists
        let primaryRequestTitle: string | null = null;
        const primaryId = (candidate as Candidate & { primary_request_id?: string | null }).primary_request_id;
        if (primaryId) {
          const { data: prData } = await supabase
            .from('requests')
            .select('title')
            .eq('id', primaryId)
            .single();
          primaryRequestTitle = (prData as { title: string } | null)?.title ?? null;
        }

        results.push({
          candidate_id: candidate.id,
          candidate_name: `${candidate.first_name} ${candidate.last_name}`,
          match_score: matchResult.match_score,
          primary_request_title: primaryRequestTitle,
          pipeline_stage: candidate.pipeline_stage,
          is_in_active_pipeline: ACTIVE_STAGES.includes(candidate.pipeline_stage),
        });
      }
    } catch (err) {
      console.error(`scan-candidates: Match failed for candidate ${candidate.id}`, err);
    }
  }

  // Sort by match_score desc
  results.sort((a, b) => b.match_score - a.match_score);

  return NextResponse.json({ results, total: results.length });
}
