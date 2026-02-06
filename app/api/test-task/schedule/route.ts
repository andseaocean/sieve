import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { generateTestTaskMessage } from '@/lib/outreach/message-generator';
import { Candidate, Request } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { candidateId, message, sendImmediately } = await request.json();

    // Get candidate
    const { data: candidateData, error: candError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    const candidate = candidateData as Candidate | null;

    if (candError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Find the matching request for this candidate
    const { data: matchData } = await supabase
      .from('candidate_request_matches')
      .select('request_id')
      .eq('candidate_id', candidateId)
      .order('match_score', { ascending: false })
      .limit(1)
      .single();

    const match = matchData as { request_id: string } | null;
    if (!match) {
      return NextResponse.json({ error: 'No request match found' }, { status: 400 });
    }

    const { data: reqData } = await supabase
      .from('requests')
      .select('*')
      .eq('id', match.request_id)
      .single();

    const req = reqData as Request | null;
    if (!req || !req.test_task_url) {
      return NextResponse.json({ error: 'No test task configured for this request' }, { status: 400 });
    }

    // Calculate send time (15+ min delay unless immediate)
    const now = new Date();
    const sendAt = sendImmediately
      ? now
      : new Date(now.getTime() + (15 + Math.floor(Math.random() * 10)) * 60 * 1000);

    // Calculate deadline
    const deadlineDays = req.test_task_deadline_days || 3;
    const deadline = new Date(sendAt);
    deadline.setDate(deadline.getDate() + deadlineDays);
    deadline.setHours(18, 0, 0, 0);

    // Generate message if not provided
    let testTaskMessage = message;
    if (!testTaskMessage) {
      testTaskMessage = await generateTestTaskMessage(candidate, req, req.test_task_url);
    }

    // Update candidate status
    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        test_task_status: 'scheduled',
        test_task_sent_at: sendAt.toISOString(),
        test_task_original_deadline: deadline.toISOString(),
        test_task_current_deadline: deadline.toISOString(),
      } as never)
      .eq('id', candidateId);

    if (updateError) throw updateError;

    // Add to outreach queue
    const { error: queueError } = await supabase
      .from('outreach_queue')
      .insert({
        candidate_id: candidateId,
        request_id: match.request_id,
        intro_message: testTaskMessage,
        test_task_message: testTaskMessage,
        delivery_method: 'telegram',
        scheduled_for: sendAt.toISOString(),
        status: 'scheduled',
      } as never);

    if (queueError) throw queueError;

    // Log in conversations
    await supabase.from('candidate_conversations').insert({
      candidate_id: candidateId,
      direction: 'outbound',
      message_type: 'test_task',
      content: testTaskMessage,
      sent_at: sendAt.toISOString(),
      metadata: {
        deadline: deadline.toISOString(),
        deadline_days: deadlineDays,
      },
    } as never);

    return NextResponse.json({
      success: true,
      sendAt,
      deadline,
    });
  } catch (error) {
    console.error('Error scheduling test task:', error);
    return NextResponse.json(
      { error: 'Failed to schedule test task' },
      { status: 500 }
    );
  }
}
