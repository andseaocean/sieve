import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';
import { analyzeWithClaude, parseAIMatchResult, MOCK_MATCH_RESULT } from '@/lib/ai/claude';
import { MATCH_CANDIDATE_TO_REQUEST_PROMPT } from '@/lib/ai/prompts';
import { Candidate, Request } from '@/lib/supabase/types';

const USE_MOCK_AI = process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { candidate_id, request_id } = body;

    if (!candidate_id || !request_id) {
      return NextResponse.json(
        { error: 'candidate_id and request_id are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch candidate
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate_id)
      .single();

    if (candidateError || !candidateData) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Fetch request
    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (requestError || !requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const candidate = candidateData as Candidate;
    const hiringRequest = requestData as Request;

    // Create candidate analysis object for the prompt
    const candidateAnalysis = {
      score: candidate.ai_score || 5,
      category: candidate.ai_category || 'potential',
      summary: candidate.ai_summary || '',
      strengths: [],
    };

    let matchResult;

    if (USE_MOCK_AI) {
      console.log('Using mock AI match');
      matchResult = MOCK_MATCH_RESULT;
    } else {
      // Call Claude API
      const prompt = MATCH_CANDIDATE_TO_REQUEST_PROMPT(candidate, candidateAnalysis, hiringRequest);
      const response = await analyzeWithClaude(prompt);
      matchResult = parseAIMatchResult(response);
    }

    // Upsert match record
    const { data: existingMatchData } = await supabase
      .from('candidate_request_matches')
      .select('id')
      .eq('candidate_id', candidate_id)
      .eq('request_id', request_id)
      .single();

    const existingMatch = existingMatchData as { id: string } | null;

    if (existingMatch) {
      // Update existing match
      await supabase
        .from('candidate_request_matches')
        .update({
          match_score: matchResult.match_score,
          match_explanation: `${matchResult.alignment}\n\nMissing: ${matchResult.missing}`,
        } as never)
        .eq('id', existingMatch.id);
    } else {
      // Create new match
      await supabase
        .from('candidate_request_matches')
        .insert({
          candidate_id,
          request_id,
          match_score: matchResult.match_score,
          match_explanation: `${matchResult.alignment}\n\nMissing: ${matchResult.missing}`,
          status: 'new',
        } as never);
    }

    return NextResponse.json({
      success: true,
      match: matchResult,
    });
  } catch (error) {
    console.error('Error in POST /api/ai/match:', error);
    return NextResponse.json({ error: 'AI matching failed' }, { status: 500 });
  }
}
