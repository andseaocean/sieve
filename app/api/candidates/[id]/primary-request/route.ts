import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';

// PUT: change the primary_request_id for a candidate
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: candidateId } = await context.params;
  const body = await request.json() as { request_id: string | null; notes?: string };
  const { request_id: newRequestId, notes } = body;

  const supabase = createServerClient();

  // Get current primary_request_id
  const { data: candidateData, error: candidateFetchError } = await supabase
    .from('candidates')
    .select('primary_request_id')
    .eq('id', candidateId)
    .single();

  if (candidateFetchError || !candidateData) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }

  const oldRequestId = (candidateData as { primary_request_id: string | null }).primary_request_id;

  // Find new match score if request_id is provided
  let newAiScore: number | null = null;
  if (newRequestId) {
    const { data: matchData } = await supabase
      .from('candidate_request_matches')
      .select('match_score')
      .eq('candidate_id', candidateId)
      .eq('request_id', newRequestId)
      .single();

    if (matchData) {
      newAiScore = (matchData as { match_score: number }).match_score;
    }
  }

  // Update candidate
  const updatePayload: Record<string, unknown> = {
    primary_request_id: newRequestId ?? null,
  };
  // Update ai_score only if we have a match score for the new vacancy
  if (newAiScore !== null) {
    updatePayload.ai_score = newAiScore;
  }

  const { error: updateError } = await supabase
    .from('candidates')
    .update(updatePayload as never)
    .eq('id', candidateId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Record in history
  const managerId = (session.user as { id: string }).id;
  await supabase
    .from('candidate_request_history')
    .insert({
      candidate_id: candidateId,
      from_request_id: oldRequestId,
      to_request_id: newRequestId ?? null,
      changed_by: managerId,
      reason: 'manager_reassign',
      notes: notes ?? null,
    } as never);

  return NextResponse.json({ success: true });
}
