import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';

interface CompetencyScore {
  competency_id: string;
  competency_name: string;
  score: number;
  comment: string;
}

interface PerCompetencyEval {
  competency_id: string;
  competency_name: string;
  score: number;
  comment: string;
}

interface AIEvaluation {
  per_competency?: PerCompetencyEval[];
}

interface VacancyHistoryEntry {
  request_id: string;
  request_title: string;
  type: 'applied' | 'recommended' | 'outreached';
  status: string;
}

export interface RecommendedCandidate {
  id: string;
  first_name: string;
  last_name: string;
  pipeline_stage: string;
  competency_scores: CompetencyScore[];
  matching_competencies_count: number;
  vacancy_history: VacancyHistoryEntry[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: requestId } = await params;
    const supabase = createServiceRoleClient();

    // Fetch the request to get questionnaire_competency_ids
    const { data: request } = await supabase
      .from('requests')
      .select('questionnaire_competency_ids')
      .eq('id', requestId)
      .single();

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const competencyIds: string[] = (request as { questionnaire_competency_ids: string[] }).questionnaire_competency_ids || [];

    if (competencyIds.length === 0) {
      // No competencies configured, return empty
      return NextResponse.json({ candidates: [] });
    }

    // Fetch competency names
    const { data: competencies } = await supabase
      .from('soft_skill_competencies')
      .select('id, name')
      .in('id', competencyIds);

    const competencyNameMap: Record<string, string> = {};
    if (competencies) {
      for (const c of competencies as { id: string; name: string }[]) {
        competencyNameMap[c.id] = c.name;
      }
    }

    // Find candidates:
    // 1. Have a completed questionnaire response
    // 2. Not blacklisted
    // 3. In 'rejected' or 'outreach_declined' pipeline stage
    // 4. Not already in candidate_request_matches for this request
    const { data: qResponses } = await supabase
      .from('questionnaire_responses')
      .select('candidate_id, ai_evaluation, request_id')
      .eq('status', 'completed');

    if (!qResponses || qResponses.length === 0) {
      return NextResponse.json({ candidates: [] });
    }

    // Get existing matches for this request to exclude them
    const { data: existingMatches } = await supabase
      .from('candidate_request_matches')
      .select('candidate_id')
      .eq('request_id', requestId);

    const excludedCandidateIds = new Set(
      (existingMatches || []).map((m: { candidate_id: string }) => m.candidate_id)
    );

    // Filter responses by matching competencies
    interface QResponse {
      candidate_id: string;
      ai_evaluation: AIEvaluation | null;
      request_id: string;
    }

    const qualifiedMap = new Map<string, { competencyScores: CompetencyScore[]; fromRequestId: string }>();

    for (const qr of qResponses as QResponse[]) {
      if (excludedCandidateIds.has(qr.candidate_id)) continue;
      if (!qr.ai_evaluation) continue;

      const perComp: PerCompetencyEval[] = qr.ai_evaluation.per_competency || [];
      const matchingScores = perComp.filter(
        (pc) => competencyIds.includes(pc.competency_id) && pc.score >= 7
      );

      if (matchingScores.length >= 3) {
        const existing = qualifiedMap.get(qr.candidate_id);
        // Keep the entry with more matching competencies
        if (!existing || matchingScores.length > existing.competencyScores.length) {
          qualifiedMap.set(qr.candidate_id, {
            competencyScores: matchingScores.map((mc) => ({
              competency_id: mc.competency_id,
              competency_name: competencyNameMap[mc.competency_id] || mc.competency_name,
              score: mc.score,
              comment: mc.comment,
            })),
            fromRequestId: qr.request_id,
          });
        }
      }
    }

    if (qualifiedMap.size === 0) {
      return NextResponse.json({ candidates: [] });
    }

    // Fetch candidates with the right pipeline stage
    const candidateIds = Array.from(qualifiedMap.keys());
    const { data: candidates } = await supabase
      .from('candidates')
      .select('id, first_name, last_name, pipeline_stage, is_blacklisted, applied_request_ids')
      .in('id', candidateIds)
      .eq('is_blacklisted', false)
      .in('pipeline_stage', ['rejected', 'outreach_declined']);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ candidates: [] });
    }

    // Fetch vacancy history for these candidates from candidate_request_matches
    const filteredIds = (candidates as { id: string }[]).map((c) => c.id);
    const { data: matchHistory } = await supabase
      .from('candidate_request_matches')
      .select('candidate_id, request_id, status, requests(title)')
      .in('candidate_id', filteredIds);

    // Fetch request titles for applied_request_ids
    const allAppliedRequestIds = new Set<string>();
    for (const c of candidates as { applied_request_ids: string[] | null }[]) {
      for (const rid of c.applied_request_ids || []) {
        allAppliedRequestIds.add(rid);
      }
    }

    let appliedRequestTitles: Record<string, string> = {};
    if (allAppliedRequestIds.size > 0) {
      const { data: appliedRequests } = await supabase
        .from('requests')
        .select('id, title')
        .in('id', Array.from(allAppliedRequestIds));
      for (const r of appliedRequests as { id: string; title: string }[] || []) {
        appliedRequestTitles[r.id] = r.title;
      }
    }

    // Build result
    interface CandidateRow {
      id: string;
      first_name: string;
      last_name: string;
      pipeline_stage: string;
      applied_request_ids: string[] | null;
    }

    interface MatchHistoryRow {
      candidate_id: string;
      request_id: string;
      status: string;
      requests: { title: string } | null;
    }

    const result: RecommendedCandidate[] = (candidates as CandidateRow[]).map((c) => {
      const qualified = qualifiedMap.get(c.id)!;

      // Build vacancy history
      const vacancyHistory: VacancyHistoryEntry[] = [];

      // From candidate_request_matches
      const cMatches = (matchHistory as MatchHistoryRow[] || []).filter(
        (m) => m.candidate_id === c.id
      );
      for (const m of cMatches) {
        vacancyHistory.push({
          request_id: m.request_id,
          request_title: m.requests?.title || 'Невідома вакансія',
          type: 'outreached',
          status: m.status,
        });
      }

      // From applied_request_ids
      for (const rid of c.applied_request_ids || []) {
        const alreadyInHistory = vacancyHistory.some((v) => v.request_id === rid);
        if (!alreadyInHistory) {
          vacancyHistory.push({
            request_id: rid,
            request_title: appliedRequestTitles[rid] || 'Невідома вакансія',
            type: 'applied',
            status: 'applied',
          });
        }
      }

      return {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        pipeline_stage: c.pipeline_stage,
        competency_scores: qualified.competencyScores,
        matching_competencies_count: qualified.competencyScores.length,
        vacancy_history: vacancyHistory,
      };
    });

    // Sort by matching_competencies_count DESC, then avg score DESC
    result.sort((a, b) => {
      if (b.matching_competencies_count !== a.matching_competencies_count) {
        return b.matching_competencies_count - a.matching_competencies_count;
      }
      const avgA = a.competency_scores.reduce((s, c) => s + c.score, 0) / (a.competency_scores.length || 1);
      const avgB = b.competency_scores.reduce((s, c) => s + c.score, 0) / (b.competency_scores.length || 1);
      return avgB - avgA;
    });

    return NextResponse.json({ candidates: result });
  } catch (error) {
    console.error('Error fetching recommended candidates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
