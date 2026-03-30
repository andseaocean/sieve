import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { Candidate, Request } from '@/lib/supabase/types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: Record<string, unknown>
): Promise<{ ok: boolean; result?: { message_id: number } }> {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        ...options,
      }),
    }
  );
  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, message, requestId } = await request.json();

    if (!candidateId || !message || !requestId) {
      return NextResponse.json({ error: 'candidateId, message, requestId required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: candidateData } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    const candidate = candidateData as Candidate | null;
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const chatId = (candidate as Candidate & { telegram_chat_id?: number }).telegram_chat_id;
    if (!chatId) {
      return NextResponse.json({ error: 'Candidate has no telegram_chat_id' }, { status: 400 });
    }

    const { data: reqData } = await supabase
      .from('requests')
      .select('test_task_deadline_days')
      .eq('id', requestId)
      .single();

    const req = reqData as Request | null;
    const deadlineDays = req?.test_task_deadline_days ?? 3;

    // Send Telegram message with two inline buttons
    // callback_data byte check:
    //   test_decline: (13) + 36 UUID = 49 bytes ✓
    //   web_app url has no byte limit
    const result = await sendTelegramMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Надіслати результати 📎',
              web_app: { url: `${APP_URL}/submit-test?id=${candidateId}` },
            },
          ],
          [
            {
              text: 'Відмовитися від виконання',
              callback_data: `test_decline:${candidateId}`,
            },
          ],
        ],
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: 'Telegram API returned not ok' }, { status: 500 });
    }

    // Calculate deadline
    const now = new Date();
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + deadlineDays);
    deadline.setHours(18, 0, 0, 0);

    // Update candidate
    await supabase
      .from('candidates')
      .update({
        test_task_status: 'sent',
        test_task_sent_at: now.toISOString(),
        test_task_original_deadline: deadline.toISOString(),
        test_task_current_deadline: deadline.toISOString(),
        pipeline_stage: 'test_sent',
      } as never)
      .eq('id', candidateId);

    // Log to conversations
    await supabase.from('candidate_conversations').insert({
      candidate_id: candidateId,
      direction: 'outbound',
      message_type: 'test_task',
      content: message,
      metadata: {
        request_id: requestId,
        deadline: deadline.toISOString(),
        deadline_days: deadlineDays,
        telegram_message_id: result.result?.message_id,
        sent_by: session.user?.email || session.user?.name,
      },
    } as never);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending test task:', error);
    return NextResponse.json({ error: 'Failed to send test task' }, { status: 500 });
  }
}
