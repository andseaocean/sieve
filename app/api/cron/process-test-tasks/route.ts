import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { Candidate, OutreachQueue } from '@/lib/supabase/types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();

    // Get candidates with scheduled test tasks ready to send
    const { data: candidatesData, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('test_task_status', 'scheduled')
      .lte('test_task_sent_at', now)
      .limit(20);

    if (error) throw error;

    const candidates = (candidatesData || []) as Candidate[];
    const results: Array<{ candidateId: string; status: string }> = [];

    for (const candidate of candidates) {
      try {
        // Get the test task message from outreach queue
        const { data: queueData } = await supabase
          .from('outreach_queue')
          .select('*')
          .eq('candidate_id', candidate.id)
          .is('sent_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const queueItem = queueData as OutreachQueue | null;

        if (!queueItem) {
          results.push({ candidateId: candidate.id, status: 'no_queue_item' });
          continue;
        }

        const message = queueItem.test_task_message || queueItem.intro_message;

        // Build submission URL
        const submissionUrl = `${BASE_URL}/submit-test?id=${candidate.id}`;
        const fullMessage = `${message}\n\nЗдати тестове завдання: ${submissionUrl}`;

        // Send via Telegram
        if (candidate.telegram_username) {
          // We need to find the chat_id - for now send to username
          // In production, we'd store chat_id when candidate first interacts
          const sent = await sendTelegramMessageToUsername(
            candidate.telegram_username,
            fullMessage
          );

          if (sent) {
            // Mark as sent
            await supabase
              .from('outreach_queue')
              .update({ sent_at: now, status: 'sent' } as never)
              .eq('id', queueItem.id);

            await supabase
              .from('candidates')
              .update({ test_task_status: 'sent' } as never)
              .eq('id', candidate.id);

            results.push({ candidateId: candidate.id, status: 'sent' });
          } else {
            results.push({ candidateId: candidate.id, status: 'send_failed' });
          }
        } else {
          results.push({ candidateId: candidate.id, status: 'no_telegram' });
        }
      } catch (err) {
        console.error(`Failed to send test task to ${candidate.id}:`, err);
        results.push({ candidateId: candidate.id, status: 'error' });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

async function sendTelegramMessageToUsername(
  username: string,
  message: string
): Promise<boolean> {
  // Note: Telegram API requires chat_id, not username for sending messages.
  // In production flow, the chat_id is captured when the candidate first
  // interacts with the bot via /start command.
  // For now, we attempt to use the username as a reference.
  // The proper flow is:
  // 1. Candidate clicks /start -> we store their chat_id
  // 2. We use that chat_id to send messages
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: `@${username}`,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}
