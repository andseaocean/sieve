/**
 * Direct Telegram Actions
 *
 * Functions that directly trigger Telegram messages without going through the automation queue.
 * Used for immediate actions after AI analysis or questionnaire completion.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Candidate, Request } from '@/lib/supabase/types';
import { generatePersonalizedOutreach } from '@/lib/outreach/message-generator';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendTelegramMessage(
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

/**
 * Send personalized outreach message directly via Telegram (no queue).
 * Sends with a single "Можемо починати 🚀" button that starts the in-bot questionnaire.
 */
export async function sendOutreachDirectly(
  supabase: SupabaseClient,
  candidateId: string,
  requestId: string
): Promise<void> {
  const { data: candidateData } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .single();

  const { data: requestData } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single();

  const candidate = candidateData as Candidate | null;
  const request = requestData as Request | null;

  if (!candidate || !request) {
    throw new Error(`Candidate or request not found: ${candidateId}, ${requestId}`);
  }

  if (!candidate.telegram_chat_id) {
    throw new Error(`Candidate ${candidateId} has no telegram_chat_id — cannot send direct outreach`);
  }

  if (!request.outreach_template || !request.outreach_template_approved) {
    throw new Error(`Request ${requestId} has no approved outreach template`);
  }

  const personalizedText = await generatePersonalizedOutreach(
    request.outreach_template,
    candidate,
    request
  );

  const result = await sendTelegramMessage(candidate.telegram_chat_id, personalizedText, {
    reply_markup: {
      inline_keyboard: [[
        {
          text: 'Можемо починати 🚀',
          callback_data: `start_questionnaire:${candidateId}`,
        },
      ]],
    },
  });

  if (!result.ok) {
    throw new Error(`Telegram API error when sending outreach to candidate ${candidateId}`);
  }

  // Save message_id for reference
  if (result.result?.message_id) {
    await supabase
      .from('candidate_request_matches')
      .update({ outreach_telegram_message_id: result.result.message_id } as never)
      .eq('candidate_id', candidateId)
      .eq('request_id', requestId);
  }

  const now = new Date().toISOString();
  await supabase
    .from('candidates')
    .update({
      pipeline_stage: 'outreach_sent',
      outreach_status: 'sent',
      outreach_sent_at: now,
      outreach_message: personalizedText,
    } as never)
    .eq('id', candidateId);

  await supabase.from('candidate_conversations').insert({
    candidate_id: candidateId,
    direction: 'outbound',
    message_type: 'outreach',
    content: personalizedText,
    metadata: {
      automated: true,
      request_id: requestId,
      telegram_message_id: result.result?.message_id,
    },
  } as never);

  console.log(`Direct outreach sent to candidate ${candidateId} for request ${requestId}`);
}

/**
 * Send test task to candidate via Telegram with Mini App button.
 * Called after questionnaire AI score >= 7.
 */
export async function sendTestTaskToCandidate(
  supabase: SupabaseClient,
  chatId: number,
  candidateId: string,
  requestId: string
): Promise<void> {
  const { data: reqData } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single();

  const req = reqData as Request | null;

  if (!req?.test_task_url) {
    console.log(`No test task URL configured for request ${requestId}, skipping`);
    return;
  }

  // Prevent duplicate sending
  const { data: candidateData } = await supabase
    .from('candidates')
    .select('test_task_status')
    .eq('id', candidateId)
    .single();

  const testTaskStatus = (candidateData as { test_task_status?: string } | null)?.test_task_status;
  if (testTaskStatus && testTaskStatus !== 'not_sent') {
    console.log(`Test task already ${testTaskStatus} for candidate ${candidateId}, skipping`);
    return;
  }

  const taskMessage = req.test_task_message
    ? `${req.test_task_message}\n\nУмови завдання: ${req.test_task_url}`
    : `Час для тестового завдання!\n\nОзнайомся з умовами за посиланням: ${req.test_task_url}`;

  const now = new Date();
  const deadlineDays = req.test_task_deadline_days || 3;
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + deadlineDays);
  deadline.setHours(18, 0, 0, 0);

  await sendTelegramMessage(chatId, taskMessage, {
    reply_markup: {
      inline_keyboard: [[
        {
          text: 'Надіслати результат 📎',
          web_app: { url: `${APP_URL}/submit-test?id=${candidateId}` },
        },
      ]],
    },
  });

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

  await supabase.from('candidate_conversations').insert({
    candidate_id: candidateId,
    direction: 'outbound',
    message_type: 'test_task',
    content: taskMessage,
    metadata: {
      deadline: deadline.toISOString(),
      deadline_days: deadlineDays,
      automated: true,
    },
  } as never);

  console.log(`Test task sent directly to candidate ${candidateId}, deadline: ${deadline.toISOString()}`);
}
