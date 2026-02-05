/**
 * API Endpoint: Schedule Outreach Message
 *
 * Schedules a generated outreach message for sending.
 * Supports both immediate send and scheduled send.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';
import { calculateScheduledTime } from '@/lib/outreach/scheduler';
import { Candidate, Request } from '@/lib/supabase/types';

interface CandidateWithMatches extends Candidate {
  candidate_request_matches?: Array<{
    request_id: string;
    match_score: number;
    requests: Request | null;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, message, contactMethod, sendNow } = await request.json();

    if (!candidateId || !message || !contactMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: candidateId, message, contactMethod' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get candidate and best matching request
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select(`
        *,
        candidate_request_matches(
          request_id,
          match_score,
          requests(*)
        )
      `)
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidateData) {
      console.error('Error fetching candidate:', candidateError);
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const candidate = candidateData as CandidateWithMatches;

    // Check if outreach already exists (scheduled, processing, or sent)
    const { data: existingOutreach } = await supabase
      .from('outreach_queue')
      .select('id, status')
      .eq('candidate_id', candidateId)
      .in('status', ['scheduled', 'processing', 'sent'])
      .single();

    if (existingOutreach) {
      return NextResponse.json(
        { error: 'Outreach already scheduled or sent for this candidate' },
        { status: 400 }
      );
    }

    // Find best matching request
    let bestMatchRequestId: string | null = null;

    if (candidate.candidate_request_matches && candidate.candidate_request_matches.length > 0) {
      const sortedMatches = [...candidate.candidate_request_matches]
        .filter((m) => m.requests !== null && m.match_score >= 60)
        .sort((a, b) => b.match_score - a.match_score);

      if (sortedMatches.length > 0) {
        bestMatchRequestId = sortedMatches[0].request_id;
      }
    }

    // Calculate send time
    const scheduledFor = sendNow
      ? new Date()
      : calculateScheduledTime(new Date());

    // Create queue entry
    const { error: queueError } = await supabase
      .from('outreach_queue')
      .insert({
        candidate_id: candidateId,
        request_id: bestMatchRequestId,
        intro_message: message,
        delivery_method: contactMethod,
        scheduled_for: scheduledFor.toISOString(),
        status: 'scheduled',
      } as never);

    if (queueError) {
      console.error('Failed to schedule outreach:', queueError);
      return NextResponse.json(
        { error: 'Failed to schedule message' },
        { status: 500 }
      );
    }

    // Update candidate status
    const updateData: Record<string, unknown> = {
      outreach_status: sendNow ? 'sent' : 'scheduled',
    };

    if (sendNow) {
      updateData.outreach_sent_at = new Date().toISOString();
    }

    await supabase
      .from('candidates')
      .update(updateData as never)
      .eq('id', candidateId);

    console.log(
      `Outreach ${sendNow ? 'sent' : 'scheduled'} for candidate ${candidateId} at ${scheduledFor.toISOString()}`
    );

    return NextResponse.json({
      success: true,
      scheduledFor: scheduledFor.toISOString(),
      sendNow,
    });
  } catch (error) {
    console.error('Error scheduling outreach:', error);
    return NextResponse.json(
      { error: 'Failed to schedule message' },
      { status: 500 }
    );
  }
}
