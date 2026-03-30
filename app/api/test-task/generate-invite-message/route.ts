import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { analyzeWithClaude } from '@/lib/ai/claude';
import { TEST_TASK_INVITE_PROMPT } from '@/lib/ai/outreach-prompts';
import { Candidate, Request } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId } = await request.json();
    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch candidate
    const { data: candidateData } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    const candidate = candidateData as Candidate | null;
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Determine request: primary_request_id or best match
    const candidateExt = candidate as Candidate & { primary_request_id?: string | null };
    let requestId = candidateExt.primary_request_id ?? null;

    if (!requestId) {
      const { data: matchData } = await supabase
        .from('candidate_request_matches')
        .select('request_id')
        .eq('candidate_id', candidateId)
        .order('match_score', { ascending: false })
        .limit(1)
        .single();
      requestId = (matchData as { request_id: string } | null)?.request_id ?? null;
    }

    if (!requestId) {
      return NextResponse.json({ error: 'No vacancy linked to this candidate' }, { status: 400 });
    }

    const { data: reqData } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .single();

    const req = reqData as Request | null;
    if (!req?.test_task_url) {
      return NextResponse.json({ error: 'Test task URL not configured for this vacancy' }, { status: 400 });
    }

    // Fetch questionnaire evaluation strengths
    const { data: qrData } = await supabase
      .from('questionnaire_responses' as never)
      .select('ai_evaluation, ai_score')
      .eq('candidate_id', candidateId)
      .eq('status', 'completed')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    const qr = qrData as { ai_evaluation: Record<string, unknown> | null; ai_score: number | null } | null;
    const strengths: string[] = [];

    if (qr?.ai_evaluation && typeof qr.ai_evaluation === 'object') {
      const evaluation = qr.ai_evaluation as { strengths?: string[] };
      if (Array.isArray(evaluation.strengths)) {
        strengths.push(...evaluation.strengths.slice(0, 2));
      }
    }

    const deadlineDays = req.test_task_deadline_days ?? 3;

    // Generate message
    const prompt = TEST_TASK_INVITE_PROMPT(candidate, req, strengths, deadlineDays);
    const aiResponse = await analyzeWithClaude(prompt);

    // Clean up response
    const message = aiResponse
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return NextResponse.json({ message, requestId });
  } catch (error) {
    console.error('Error generating test task invite message:', error);
    return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 });
  }
}
