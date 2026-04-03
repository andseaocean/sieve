/**
 * Outreach Processor
 *
 * Handles sending outreach messages and updating statuses.
 */

import { createServerClient } from '@/lib/supabase/client';
import { OutreachQueue, Candidate } from '@/lib/supabase/types';
import { sendTelegramMessageFromHandler } from '@/lib/automation/handlers';

interface OutreachItemWithCandidate extends OutreachQueue {
  candidates: Candidate;
}

interface ProcessResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Process a single outreach queue item
 *
 * Sends the message via the configured delivery method and updates statuses.
 */
export async function processOutreachItem(item: OutreachItemWithCandidate): Promise<ProcessResult> {
  const supabase = createServerClient();
  const now = new Date().toISOString();

  // Mark as processing
  await supabase
    .from('outreach_queue')
    .update({
      status: 'processing',
      updated_at: now,
    } as never)
    .eq('id', item.id);

  let result: ProcessResult;

  result = await sendViaTelegram(item);

  if (result.success) {
    // Update queue status to sent
    await supabase
      .from('outreach_queue')
      .update({
        status: 'sent',
        sent_at: now,
        updated_at: now,
      } as never)
      .eq('id', item.id);

    // Update candidate outreach status, pipeline stage, and save message text
    await supabase
      .from('candidates')
      .update({
        outreach_status: 'sent',
        outreach_sent_at: now,
        outreach_message: item.intro_message || null,
        pipeline_stage: 'outreach_sent',
      } as never)
      .eq('id', item.candidate_id);

    // Create message history record
    await supabase
      .from('outreach_messages')
      .insert({
        candidate_id: item.candidate_id,
        request_id: item.request_id,
        message_type: 'intro',
        content: item.intro_message,
        delivery_method: item.delivery_method || 'email',
        sent_at: now,
        external_message_id: result.messageId || null,
      } as never);

    console.log(`Outreach sent successfully to candidate ${item.candidate_id}`);
  } else {
    // Mark as failed
    const retryCount = (item.retry_count || 0) + 1;

    await supabase
      .from('outreach_queue')
      .update({
        status: 'failed',
        error_message: result.error,
        retry_count: retryCount,
        updated_at: now,
      } as never)
      .eq('id', item.id);

    console.error(`Outreach failed for candidate ${item.candidate_id}: ${result.error}`);
  }

  return result;
}

/**
 * Send outreach via Telegram
 */
async function sendViaTelegram(item: OutreachItemWithCandidate): Promise<ProcessResult> {
  const candidate = item.candidates;

  if (!candidate.telegram_chat_id) {
    return {
      success: false,
      error: 'Candidate has no telegram_chat_id',
    };
  }

  try {
    const replyMarkup = {
      inline_keyboard: [[
        {
          text: 'Можемо починати 🚀',
          callback_data: `start_questionnaire:${item.candidate_id}`,
        },
      ]],
    };

    const result = await sendTelegramMessageFromHandler(
      candidate.telegram_chat_id,
      item.intro_message || '',
      { reply_markup: replyMarkup }
    );

    if (!result.ok) {
      return { success: false, error: 'Telegram API returned not ok' };
    }

    return { success: true, messageId: String(result.result?.message_id ?? '') };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Telegram error',
    };
  }
}


/**
 * Process multiple outreach items in batch
 */
export async function processBatchOutreach(
  items: OutreachItemWithCandidate[]
): Promise<{ successful: number; failed: number; results: ProcessResult[] }> {
  const results: ProcessResult[] = [];
  let successful = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const result = await processOutreachItem(item);
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Small delay between sends to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error processing outreach item ${item.id}:`, error);
      failed++;
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { successful, failed, results };
}

/**
 * Get pending outreach items that are due for sending
 */
export async function getDueOutreachItems(limit: number = 10): Promise<OutreachItemWithCandidate[]> {
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('outreach_queue')
    .select(`
      *,
      candidates(*)
    `)
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching due outreach items:', error);
    return [];
  }

  return (data || []) as OutreachItemWithCandidate[];
}
