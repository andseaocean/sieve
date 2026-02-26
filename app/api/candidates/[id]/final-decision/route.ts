import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { addToAutomationQueue } from '@/lib/automation/queue';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: candidateId } = await params;
    const { decision, request_id } = await request.json();

    if (!['invite', 'reject'].includes(decision) || !request_id) {
      return NextResponse.json({ error: 'Invalid request: decision and request_id required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Get manager ID from session
    const { data: manager } = await supabase
      .from('managers')
      .select('id')
      .eq('email', session.user?.email || '')
      .single();

    const managerId = (manager as { id: string } | null)?.id || null;

    // Save decision to candidate_request_matches
    await supabase
      .from('candidate_request_matches')
      .update({
        final_decision: decision,
        final_decision_at: new Date().toISOString(),
        final_decision_by: managerId,
        status: decision === 'invite' ? 'interview' : 'rejected',
      } as never)
      .eq('candidate_id', candidateId)
      .eq('request_id', request_id);

    // Update pipeline_stage
    await supabase
      .from('candidates')
      .update({
        pipeline_stage: decision === 'invite' ? 'interview' : 'rejected',
      } as never)
      .eq('id', candidateId);

    // Queue automated message
    if (decision === 'invite') {
      // Send invite immediately
      await addToAutomationQueue({
        supabase,
        actionType: 'send_invite',
        candidateId,
        requestId: request_id,
      });
    } else {
      // Send rejection after 24 hours
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await addToAutomationQueue({
        supabase,
        actionType: 'send_rejection',
        candidateId,
        requestId: request_id,
        scheduledFor: tomorrow,
      });
    }

    return NextResponse.json({
      success: true,
      decision,
    });
  } catch (error) {
    console.error('Error processing final decision:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
