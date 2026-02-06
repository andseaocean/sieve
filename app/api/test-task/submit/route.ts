import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { evaluateTestTask } from '@/lib/ai/evaluateTestTask';
import { Candidate } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      candidateId,
      submissionText,
      candidateFeedback,
    } = await request.json();

    if (!submissionText?.trim()) {
      return NextResponse.json({ error: 'Submission text is required' }, { status: 400 });
    }

    // Get candidate and request info
    const { data: candidateData } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    const candidate = candidateData as Candidate | null;

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Get request info via match
    const { data: matchData } = await supabase
      .from('candidate_request_matches')
      .select('request_id')
      .eq('candidate_id', candidateId)
      .order('match_score', { ascending: false })
      .limit(1)
      .single();

    const matchRow = matchData as { request_id: string } | null;
    let req: Record<string, unknown> | null = null;
    if (matchRow) {
      const { data: reqData } = await supabase
        .from('requests')
        .select('*')
        .eq('id', matchRow.request_id)
        .single();
      req = reqData as Record<string, unknown> | null;
    }

    const submittedAt = new Date();
    const deadline = candidate.test_task_current_deadline
      ? new Date(candidate.test_task_current_deadline)
      : null;

    // Calculate if late
    let lateByHours = 0;
    if (deadline && submittedAt > deadline) {
      lateByHours = Math.floor((submittedAt.getTime() - deadline.getTime()) / (1000 * 60 * 60));
    }

    // Update candidate with submission
    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        test_task_status: 'evaluating',
        test_task_submitted_at: submittedAt.toISOString(),
        test_task_submission_text: submissionText,
        test_task_candidate_feedback: candidateFeedback || null,
        test_task_late_by_hours: lateByHours > 0 ? lateByHours : null,
      } as never)
      .eq('id', candidateId);

    if (updateError) throw updateError;

    // Log submission in conversations
    await supabase.from('candidate_conversations').insert({
      candidate_id: candidateId,
      direction: 'inbound',
      message_type: 'candidate_response',
      content: `[TEST TASK SUBMISSION]\n\n${submissionText.substring(0, 500)}${submissionText.length > 500 ? '...' : ''}`,
      metadata: {
        full_submission_length: submissionText.length,
        submitted_on_time: lateByHours === 0,
        late_by_hours: lateByHours,
      },
    } as never);

    // Start AI evaluation (async, don't wait)
    evaluateTestTaskAsync(
      candidateId,
      submissionText,
      (req?.test_task_evaluation_criteria as string) || 'Quality, completeness, clarity',
      (req?.test_task_url as string) || 'Test task'
    ).catch(err => console.error('Async evaluation error:', err));

    return NextResponse.json({
      success: true,
      status: lateByHours > 0 ? 'submitted_late' : 'submitted_on_time',
      lateByHours: lateByHours > 0 ? lateByHours : null,
      message: 'Дякуємо за виконання тестового завдання! Ми перевіримо його найближчим часом.',
    });
  } catch (error) {
    console.error('Error submitting test task:', error);
    return NextResponse.json(
      { error: 'Failed to submit test task' },
      { status: 500 }
    );
  }
}

async function evaluateTestTaskAsync(
  candidateId: string,
  submissionText: string,
  evaluationCriteria: string,
  testTaskDescription: string
) {
  try {
    const supabase = createServerClient();

    const evaluation = await evaluateTestTask(
      submissionText,
      evaluationCriteria,
      testTaskDescription
    );

    const evaluationText = `**Score: ${evaluation.score}/10**

${evaluation.evaluation}

**Strengths:**
${evaluation.strengths.map(s => `• ${s}`).join('\n')}

**Areas for improvement:**
${evaluation.improvements.map(i => `• ${i}`).join('\n')}`;

    await supabase
      .from('candidates')
      .update({
        test_task_status: 'evaluated',
        test_task_ai_score: evaluation.score,
        test_task_ai_evaluation: evaluationText,
      } as never)
      .eq('id', candidateId);

    console.log(`Test task evaluated for candidate ${candidateId}: ${evaluation.score}/10`);
  } catch (error) {
    console.error('Error in async evaluation:', error);

    const supabase = createServerClient();
    await supabase
      .from('candidates')
      .update({
        test_task_status: 'submitted_on_time',
        test_task_ai_evaluation: 'Error during automatic evaluation. Manual review needed.',
      } as never)
      .eq('id', candidateId);
  }
}
