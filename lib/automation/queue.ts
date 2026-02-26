/**
 * Automation Queue Utilities
 *
 * Functions for adding, processing, and managing items in the automation_queue table.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AutomationActionType } from '@/lib/supabase/types';

const MAX_RETRIES = 3;

interface AddToQueueParams {
  supabase: SupabaseClient;
  actionType: AutomationActionType;
  candidateId: string;
  requestId: string;
  scheduledFor?: Date;
  payload?: Record<string, unknown>;
}

/**
 * Add an action to the automation queue
 */
export async function addToAutomationQueue({
  supabase,
  actionType,
  candidateId,
  requestId,
  scheduledFor,
  payload,
}: AddToQueueParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Check for duplicate pending/processing jobs
    const { data: existing } = await supabase
      .from('automation_queue')
      .select('id')
      .eq('action_type', actionType)
      .eq('candidate_id', candidateId)
      .eq('request_id', requestId)
      .in('status', ['pending', 'processing'])
      .single();

    if (existing) {
      console.log(`Automation: Duplicate ${actionType} for candidate ${candidateId}, skipping`);
      return { success: false, error: 'Duplicate job exists' };
    }

    const { error } = await supabase
      .from('automation_queue')
      .insert({
        action_type: actionType,
        candidate_id: candidateId,
        request_id: requestId,
        scheduled_for: (scheduledFor || new Date()).toISOString(),
        payload: payload || {},
      } as never);

    if (error) {
      console.error('Automation: Failed to add to queue', error);
      return { success: false, error: error.message };
    }

    console.log(`Automation: Added ${actionType} for candidate ${candidateId}`);
    return { success: true };
  } catch (error) {
    console.error('Automation: Error adding to queue', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export interface AutomationJob {
  id: string;
  action_type: AutomationActionType;
  candidate_id: string;
  request_id: string;
  scheduled_for: string;
  payload: Record<string, unknown>;
  retry_count: number;
}

/**
 * Fetch pending jobs that are ready to execute
 */
export async function fetchPendingJobs(
  supabase: SupabaseClient,
  batchSize: number = 10
): Promise<AutomationJob[]> {
  const { data, error } = await supabase
    .from('automation_queue')
    .select('*')
    .eq('status', 'pending')
    .lt('retry_count', MAX_RETRIES)
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(batchSize);

  if (error) {
    console.error('Automation: Error fetching pending jobs', error);
    return [];
  }

  return (data || []) as AutomationJob[];
}

/**
 * Mark a job as processing
 */
export async function markJobProcessing(supabase: SupabaseClient, jobId: string) {
  await supabase
    .from('automation_queue')
    .update({ status: 'processing' } as never)
    .eq('id', jobId);
}

/**
 * Mark a job as completed
 */
export async function markJobCompleted(supabase: SupabaseClient, jobId: string) {
  await supabase
    .from('automation_queue')
    .update({
      status: 'completed',
      executed_at: new Date().toISOString(),
    } as never)
    .eq('id', jobId);
}

/**
 * Mark a job as failed (will retry if under MAX_RETRIES)
 */
export async function markJobFailed(supabase: SupabaseClient, jobId: string, error: string, retryCount: number) {
  const newRetryCount = retryCount + 1;
  const newStatus = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending';

  await supabase
    .from('automation_queue')
    .update({
      status: newStatus,
      error_message: error,
      retry_count: newRetryCount,
    } as never)
    .eq('id', jobId);
}

/**
 * Cancel a pending job
 */
export async function cancelJob(supabase: SupabaseClient, jobId: string) {
  await supabase
    .from('automation_queue')
    .update({ status: 'cancelled' } as never)
    .eq('id', jobId)
    .eq('status', 'pending');
}
