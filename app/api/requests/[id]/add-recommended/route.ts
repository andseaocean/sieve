import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { addToAutomationQueue } from '@/lib/automation/queue';
import { generateReOutreach } from '@/lib/outreach/message-generator';
import type { Candidate, Request } from '@/lib/supabase/types';

interface CompetencyScore {
  competency_id: string;
  competency_name: string;
  score: number;
  comment: string;
}

interface AddRecommendedBody {
  candidate_ids: string[];
  message_template?: string;
  competency_scores_by_candidate?: Record<string, CompetencyScore[]>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body: AddRecommendedBody = await request.json();
    const { candidate_ids, competency_scores_by_candidate = {} } = body;

    if (!candidate_ids || candidate_ids.length === 0) {
      return NextResponse.json({ error: 'No candidates provided' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch the request
    const { data: requestData } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const req = requestData as Request;

    // Fetch candidates
    const { data: candidates } = await supabase
      .from('candidates')
      .select('*')
      .in('id', candidate_ids)
      .eq('is_blacklisted', false);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ error: 'No valid candidates found' }, { status: 400 });
    }

    const results: { candidateId: string; success: boolean; error?: string }[] = [];

    for (const candidateRow of candidates as Candidate[]) {
      try {
        // Check if match already exists
        const { data: existingMatch } = await supabase
          .from('candidate_request_matches')
          .select('id')
          .eq('candidate_id', candidateRow.id)
          .eq('request_id', requestId)
          .single();

        if (!existingMatch) {
          // Insert candidate_request_match
          await supabase
            .from('candidate_request_matches')
            .insert({
              candidate_id: candidateRow.id,
              request_id: requestId,
              match_score: null,
              match_explanation: 'Рекомендовано на основі результатів анкети',
              status: 'new',
            } as never);
        }

        // Generate personalized re-outreach message
        const competencyScores = competency_scores_by_candidate[candidateRow.id] || [];
        const personalizedMessage = await generateReOutreach(
          candidateRow,
          req,
          competencyScores.map((cs) => ({
            competency_name: cs.competency_name,
            score: cs.score,
            comment: cs.comment,
          }))
        );

        // Store outreach message on candidate
        await supabase
          .from('candidates')
          .update({
            outreach_message: personalizedMessage,
            pipeline_stage: 'outreach_sent',
          } as never)
          .eq('id', candidateRow.id);

        // Queue send_outreach automation job
        await addToAutomationQueue({
          supabase,
          actionType: 'send_outreach',
          candidateId: candidateRow.id,
          requestId,
        });

        // Log to candidate_conversations
        await supabase
          .from('candidate_conversations')
          .insert({
            candidate_id: candidateRow.id,
            direction: 'outbound',
            message_type: 'outreach',
            content: personalizedMessage,
            metadata: {
              automated: true,
              request_id: requestId,
              source: 'recommended_tab',
            },
          } as never);

        results.push({ candidateId: candidateRow.id, success: true });
      } catch (err) {
        console.error(`Error adding recommended candidate ${candidateRow.id}:`, err);
        results.push({
          candidateId: candidateRow.id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error in add-recommended:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
