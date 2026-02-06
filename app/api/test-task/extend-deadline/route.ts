import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { parseDeadlineRequest } from '@/lib/utils/parseDeadlineRequest';

const MAX_EXTENSIONS = 2;

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { candidateId, requestText } = await request.json();

    // Get candidate current state
    const { data: candidateData, error } = await supabase
      .from('candidates')
      .select('test_task_current_deadline, test_task_extensions_count')
      .eq('id', candidateId)
      .single();

    const candidate = candidateData as { test_task_current_deadline: string | null; test_task_extensions_count: number | null } | null;

    if (error || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if (!candidate.test_task_current_deadline) {
      return NextResponse.json({ error: 'No test task deadline set' }, { status: 400 });
    }

    // Check if already exceeded max extensions
    if ((candidate.test_task_extensions_count || 0) >= MAX_EXTENSIONS) {
      const denyMessage = `На жаль, дедлайн вже був продовжений двічі. Якщо вам потрібен особливий виняток, напишіть нам окремо, і ми обговоримо індивідуально.`;

      await supabase.from('candidate_conversations').insert({
        candidate_id: candidateId,
        direction: 'outbound',
        message_type: 'deadline_extension_denied',
        content: denyMessage,
        metadata: { reason: 'max_extensions_reached' },
      } as never);

      return NextResponse.json({
        granted: false,
        reason: 'max_extensions_reached',
        message: denyMessage,
      });
    }

    // Parse the request
    const currentDeadline = new Date(candidate.test_task_current_deadline);
    const extension = await parseDeadlineRequest(requestText, currentDeadline);

    if (!extension.isReasonable || !extension.requestedDate) {
      const denyMessage = `На жаль, не можу продовжити дедлайн більше ніж на 7 днів. Якщо вам потрібно більше часу, зв'яжіться з нами напряму.`;

      await supabase.from('candidate_conversations').insert({
        candidate_id: candidateId,
        direction: 'outbound',
        message_type: 'deadline_extension_denied',
        content: denyMessage,
        metadata: {
          reason: 'exceeds_max_days',
          requested_days: extension.additionalDays,
        },
      } as never);

      return NextResponse.json({
        granted: false,
        reason: 'exceeds_limit',
        message: denyMessage,
      });
    }

    // Grant extension
    const newDeadline = extension.requestedDate;

    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        test_task_current_deadline: newDeadline.toISOString(),
        test_task_extensions_count: (candidate.test_task_extensions_count || 0) + 1,
      } as never)
      .eq('id', candidateId);

    if (updateError) throw updateError;

    const confirmMessage = `Звісно! Продовжую дедлайн до ${newDeadline.toLocaleDateString('uk-UA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}. Успіхів з виконанням!`;

    await supabase.from('candidate_conversations').insert({
      candidate_id: candidateId,
      direction: 'outbound',
      message_type: 'deadline_extension_granted',
      content: confirmMessage,
      metadata: {
        old_deadline: currentDeadline.toISOString(),
        new_deadline: newDeadline.toISOString(),
        extension_days: extension.additionalDays,
      },
    } as never);

    return NextResponse.json({
      granted: true,
      newDeadline,
      extensionDays: extension.additionalDays,
      message: confirmMessage,
    });
  } catch (error) {
    console.error('Error extending deadline:', error);
    return NextResponse.json(
      { error: 'Failed to extend deadline' },
      { status: 500 }
    );
  }
}
