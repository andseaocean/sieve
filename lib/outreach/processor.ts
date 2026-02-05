/**
 * Outreach Processor
 *
 * Handles sending outreach messages and updating statuses.
 */

import { createServerClient } from '@/lib/supabase/client';
import { OutreachQueue, Candidate } from '@/lib/supabase/types';
import { sendOutreachEmail, formatEmailHtml, generateEmailSubject } from './email-service';

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

  // Currently only email is supported (Telegram for future)
  if (item.delivery_method === 'email') {
    result = await sendViaEmail(item);
  } else {
    // Telegram fallback to email for now
    console.log(`Telegram not implemented, falling back to email for candidate ${item.candidate_id}`);
    result = await sendViaEmail(item);
  }

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

    // Update candidate outreach status
    await supabase
      .from('candidates')
      .update({
        outreach_status: 'sent',
        outreach_sent_at: now,
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
        delivery_method: 'email', // Always email for now
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
 * Send outreach via email
 */
async function sendViaEmail(item: OutreachItemWithCandidate): Promise<ProcessResult> {
  const candidate = item.candidates;

  if (!candidate.email) {
    return {
      success: false,
      error: 'Candidate email not found',
    };
  }

  const subject = generateEmailSubject(candidate.first_name);
  const html = formatEmailHtml(item.intro_message, candidate.first_name);
  const text = item.intro_message;

  const result = await sendOutreachEmail({
    to: candidate.email,
    subject,
    html,
    text,
  });

  return result;
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
