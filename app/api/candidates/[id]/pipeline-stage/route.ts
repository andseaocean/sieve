import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';
import type { PipelineStage } from '@/lib/supabase/types';

const VALID_STAGES: PipelineStage[] = [
  'new', 'analyzed', 'outreach_sent', 'questionnaire_sent', 'questionnaire_done',
  'test_sent', 'test_done', 'interview', 'rejected', 'hired', 'outreach_declined',
];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: candidateId } = await params;
    const { stage, reason } = await request.json() as { stage: PipelineStage; reason?: string };

    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Get current candidate
    const { data: candidate } = await supabase
      .from('candidates')
      .select('pipeline_stage, is_blacklisted')
      .eq('id', candidateId)
      .single();

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if ((candidate as { is_blacklisted: boolean }).is_blacklisted) {
      return NextResponse.json(
        { error: 'Кандидат у чорному списку. Спочатку зніміть його з чорного списку.' },
        { status: 400 }
      );
    }

    const fromStage = (candidate as { pipeline_stage: PipelineStage }).pipeline_stage;

    if (fromStage === stage) {
      return NextResponse.json({ error: 'Stage is already set to this value' }, { status: 400 });
    }

    // Get manager ID
    const { data: manager } = await supabase
      .from('managers')
      .select('id')
      .eq('email', session.user?.email || '')
      .single();

    const managerId = (manager as { id: string } | null)?.id || null;

    // Update pipeline_stage
    await supabase
      .from('candidates')
      .update({ pipeline_stage: stage } as never)
      .eq('id', candidateId);

    // Log to candidate_conversations
    await supabase
      .from('candidate_conversations')
      .insert({
        candidate_id: candidateId,
        direction: 'outbound',
        message_type: 'manual_stage_change',
        content: JSON.stringify({ from: fromStage, to: stage, reason: reason || null }),
        metadata: {
          changed_by: managerId,
          from_stage: fromStage,
          to_stage: stage,
          reason: reason || null,
        },
      } as never);

    return NextResponse.json({ success: true, stage });
  } catch (error) {
    console.error('Error updating pipeline stage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
