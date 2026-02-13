import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { analyzeWithClaude } from '@/lib/ai/claude';
import { TEST_TASK_APPROVAL_PROMPT, TEST_TASK_REJECTION_PROMPT } from '@/lib/ai/outreach-prompts';
import { Candidate, Request } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, decision } = await request.json();

    if (!candidateId || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
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

    // Find best matching request
    const { data: matchData } = await supabase
      .from('candidate_request_matches')
      .select('request_id')
      .eq('candidate_id', candidateId)
      .order('match_score', { ascending: false })
      .limit(1)
      .single();

    let req: Request | null = null;
    if (matchData) {
      const { data: reqData } = await supabase
        .from('requests')
        .select('*')
        .eq('id', (matchData as { request_id: string }).request_id)
        .single();
      req = reqData as Request | null;
    }

    const evaluation = {
      score: (candidate as Candidate & { test_task_ai_score?: number }).test_task_ai_score || 0,
      evaluation: (candidate as Candidate & { test_task_ai_evaluation?: string }).test_task_ai_evaluation || '',
    };

    const prompt = decision === 'approved'
      ? TEST_TASK_APPROVAL_PROMPT(candidate, req, evaluation)
      : TEST_TASK_REJECTION_PROMPT(candidate, req, evaluation);

    const message = await analyzeWithClaude(prompt);

    // Clean up AI response (remove quotes, code blocks)
    const cleaned = message
      .replace(/^["']|["']$/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^(Ось |Here is |Message:|Повідомлення:)\s*/i, '')
      .trim();

    return NextResponse.json({ message: cleaned });
  } catch (error) {
    console.error('Error generating decision message:', error);
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    );
  }
}
