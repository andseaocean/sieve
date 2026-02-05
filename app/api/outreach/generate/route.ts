/**
 * API Endpoint: Generate Outreach Message
 *
 * On-demand generation of personalized outreach messages.
 * Called when a manager clicks "Generate Message" for a candidate.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';
import { generateWarmIntroMessage, createAnalysisResultFromCandidate } from '@/lib/outreach/message-generator';
import { determineDeliveryMethod } from '@/lib/outreach/scheduler';
import { Candidate, Request } from '@/lib/supabase/types';

interface CandidateWithMatches extends Candidate {
  candidate_request_matches?: Array<{
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

    const { candidateId } = await request.json();

    if (!candidateId) {
      return NextResponse.json({ error: 'Missing candidateId' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get candidate data with matching requests
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select(`
        *,
        candidate_request_matches(
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

    // Determine contact method
    const contactMethod = determineDeliveryMethod(
      candidate.preferred_contact_methods,
      candidate.telegram_username
    );

    // Check if contact is possible
    if (contactMethod === 'email' && !candidate.email) {
      return NextResponse.json({
        error: 'No email address available for this candidate',
      }, { status: 400 });
    }

    if (contactMethod === 'telegram' && !candidate.telegram_username) {
      return NextResponse.json({
        error: 'No Telegram username available for this candidate',
      }, { status: 400 });
    }

    // Find best matching request (score >= 60)
    let bestMatch: { request: Request; match_score: number } | undefined;

    if (candidate.candidate_request_matches && candidate.candidate_request_matches.length > 0) {
      const sortedMatches = [...candidate.candidate_request_matches]
        .filter((m) => m.requests !== null && m.match_score >= 60)
        .sort((a, b) => b.match_score - a.match_score);

      if (sortedMatches.length > 0 && sortedMatches[0].requests) {
        bestMatch = {
          request: sortedMatches[0].requests,
          match_score: sortedMatches[0].match_score,
        };
      }
    }

    // Create analysis result from candidate data
    const analysis = createAnalysisResultFromCandidate(candidate);

    // Generate personalized message
    console.log(`Generating outreach message for candidate ${candidateId}`);
    const message = await generateWarmIntroMessage({
      candidate,
      analysis,
      bestMatch,
    });

    return NextResponse.json({
      message,
      contactMethod,
      requestTitle: bestMatch?.request.title || null,
      candidateName: `${candidate.first_name} ${candidate.last_name}`,
    });
  } catch (error) {
    console.error('Error generating outreach message:', error);
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    );
  }
}
