/**
 * Schedule Outreach Service
 *
 * Handles scheduling outreach messages after AI analysis completes.
 * Only schedules outreach for candidates with score >= 7.
 */

import { createServerClient } from '@/lib/supabase/client';
import { Candidate, Request } from '@/lib/supabase/types';
import { generateWarmIntroMessage, createAnalysisResultFromCandidate } from './message-generator';
import { calculateScheduledTime, determineDeliveryMethod } from './scheduler';
import { AIAnalysisResult } from '@/lib/ai/outreach-prompts';

const MIN_SCORE_FOR_OUTREACH = 7;

interface ScheduleOutreachParams {
  candidateId: string;
  analysis: AIAnalysisResult;
  bestMatch?: {
    request: Request;
    match_score: number;
  };
}

/**
 * Schedule outreach for a candidate after AI analysis completes
 *
 * This function should be called at the end of the AI analysis pipeline.
 * It only schedules outreach if the candidate's score is >= 7.
 */
export async function scheduleOutreachAfterAnalysis(
  params: ScheduleOutreachParams
): Promise<{ scheduled: boolean; error?: string }> {
  const { candidateId, analysis, bestMatch } = params;

  // Only schedule if score is high enough
  if (analysis.score < MIN_SCORE_FOR_OUTREACH) {
    console.log(`Outreach: Skipping candidate ${candidateId} - score ${analysis.score} < ${MIN_SCORE_FOR_OUTREACH}`);
    return { scheduled: false };
  }

  const supabase = createServerClient();

  try {
    // Fetch full candidate data
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidateData) {
      console.error('Outreach: Failed to fetch candidate', candidateId, candidateError);
      return { scheduled: false, error: 'Candidate not found' };
    }

    const candidate = candidateData as Candidate;

    // Only schedule for warm candidates (from form)
    if (candidate.source !== 'warm') {
      console.log(`Outreach: Skipping cold candidate ${candidateId}`);
      return { scheduled: false };
    }

    // Check if outreach already scheduled or sent
    const { data: existingOutreach } = await supabase
      .from('outreach_queue')
      .select('id, status')
      .eq('candidate_id', candidateId)
      .in('status', ['scheduled', 'processing', 'sent'])
      .single();

    const existingData = existingOutreach as { id: string; status: string } | null;
    if (existingData) {
      console.log(`Outreach: Already exists for candidate ${candidateId} with status ${existingData.status}`);
      return { scheduled: false, error: 'Outreach already exists' };
    }

    // Determine delivery method (email only for MVP)
    const deliveryMethod = determineDeliveryMethod(
      candidate.preferred_contact_methods,
      candidate.telegram_username
    );

    // For MVP, always use email
    const finalDeliveryMethod = 'email';

    // Generate personalized message
    const introMessage = await generateWarmIntroMessage({
      candidate,
      analysis,
      bestMatch,
    });

    // Calculate scheduled time based on submission time
    const submissionTime = new Date(candidate.created_at);
    const scheduledFor = calculateScheduledTime(submissionTime);

    // Create outreach queue entry
    const { error: insertError } = await supabase
      .from('outreach_queue')
      .insert({
        candidate_id: candidateId,
        request_id: bestMatch?.request.id || null,
        intro_message: introMessage,
        delivery_method: finalDeliveryMethod,
        scheduled_for: scheduledFor.toISOString(),
        status: 'scheduled',
      } as never);

    if (insertError) {
      console.error('Outreach: Failed to create queue entry', insertError);
      return { scheduled: false, error: insertError.message };
    }

    // Update candidate outreach status
    await supabase
      .from('candidates')
      .update({
        outreach_status: 'scheduled',
      } as never)
      .eq('id', candidateId);

    console.log(`Outreach: Scheduled for candidate ${candidateId} via ${finalDeliveryMethod} at ${scheduledFor.toISOString()}`);

    return { scheduled: true };
  } catch (error) {
    console.error('Outreach: Error scheduling outreach', error);
    return {
      scheduled: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Schedule outreach for a candidate using existing candidate data
 * (alternative entry point when we don't have analysis object)
 */
export async function scheduleOutreachForCandidate(candidateId: string): Promise<{ scheduled: boolean; error?: string }> {
  const supabase = createServerClient();

  // Fetch candidate
  const { data: candidate, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .single();

  if (error || !candidate) {
    return { scheduled: false, error: 'Candidate not found' };
  }

  // Create analysis result from candidate data
  const analysis = createAnalysisResultFromCandidate(candidate as Candidate);

  // Find best match
  const { data: matchDataRaw } = await supabase
    .from('candidate_request_matches')
    .select('match_score, requests(*)')
    .eq('candidate_id', candidateId)
    .order('match_score', { ascending: false })
    .limit(1)
    .single();

  let bestMatch: { request: Request; match_score: number } | undefined;
  const matchData = matchDataRaw as { match_score: number | null; requests: unknown } | null;
  if (matchData && matchData.match_score && matchData.match_score >= 60) {
    bestMatch = {
      request: matchData.requests as Request,
      match_score: matchData.match_score,
    };
  }

  return scheduleOutreachAfterAnalysis({
    candidateId,
    analysis,
    bestMatch,
  });
}

/**
 * Cancel scheduled outreach for a candidate
 */
export async function cancelOutreach(candidateId: string): Promise<boolean> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('outreach_queue')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    } as never)
    .eq('candidate_id', candidateId)
    .eq('status', 'scheduled');

  if (error) {
    console.error('Error cancelling outreach:', error);
    return false;
  }

  // Update candidate status
  await supabase
    .from('candidates')
    .update({
      outreach_status: 'cancelled',
    } as never)
    .eq('id', candidateId);

  return true;
}
