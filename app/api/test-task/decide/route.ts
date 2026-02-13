import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { Candidate } from '@/lib/supabase/types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    }
  );
  return response.ok;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, decision, message } = await request.json();

    if (!candidateId || !['approved', 'rejected'].includes(decision) || !message) {
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

    // Send via Telegram if chat_id is available
    const chatId = (candidate as Candidate & { telegram_chat_id?: number }).telegram_chat_id;
    let telegramSent = false;

    if (chatId) {
      telegramSent = await sendTelegramMessage(chatId, message);
      if (!telegramSent) {
        console.error(`Failed to send Telegram message to chat_id ${chatId}`);
      }
    } else {
      console.warn(`No telegram_chat_id for candidate ${candidateId}`);
    }

    // Update candidate test_task_status
    await supabase
      .from('candidates')
      .update({ test_task_status: decision } as never)
      .eq('id', candidateId);

    // Update candidate_request_matches status
    const newMatchStatus = decision === 'approved' ? 'interview' : 'rejected';
    await supabase
      .from('candidate_request_matches')
      .update({ status: newMatchStatus } as never)
      .eq('candidate_id', candidateId);

    // Log to conversations
    await supabase.from('candidate_conversations').insert({
      candidate_id: candidateId,
      direction: 'outbound',
      message_type: 'test_task_decision',
      content: message,
      metadata: {
        decision,
        telegram_sent: telegramSent,
        decided_by: session.user?.email || session.user?.name,
      },
    } as never);

    return NextResponse.json({
      success: true,
      telegramSent,
      decision,
    });
  } catch (error) {
    console.error('Error processing test task decision:', error);
    return NextResponse.json(
      { error: 'Failed to process decision' },
      { status: 500 }
    );
  }
}
