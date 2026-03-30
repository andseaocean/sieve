import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';

interface CandidateRow {
  id: string;
  first_name: string;
  last_name: string;
  ai_score: number | null;
  ai_category: string | null;
  pipeline_stage: string;
  primary_request_id: string | null;
  created_at: string;
  test_task_submitted_at?: string | null;
}

interface MatchRow {
  candidate_id: string | null;
}

interface RequestRow {
  id: string;
  title: string;
}

interface QuestionnaireRow {
  candidate_id: string;
  submitted_at: string | null;
}

export async function GET() {
  const supabase = createServiceRoleClient();

  // 1. New: pipeline_stage = 'new' AND ai_score IS NULL
  const { data: newRaw } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, ai_score, ai_category, pipeline_stage, primary_request_id, created_at')
    .eq('pipeline_stage', 'new')
    .is('ai_score', null)
    .eq('is_blacklisted', false)
    .order('created_at', { ascending: false });
  const newCandidates = (newRaw || []) as unknown as CandidateRow[];

  // 2. Analyzed: pipeline_stage = 'analyzed'
  const { data: analyzedRaw } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, ai_score, ai_category, pipeline_stage, primary_request_id, created_at')
    .eq('pipeline_stage', 'analyzed')
    .eq('is_blacklisted', false)
    .order('created_at', { ascending: false });
  const analyzedCandidates = (analyzedRaw || []) as unknown as CandidateRow[];

  // 3. Questionnaire done, test not sent
  const { data: questionnaireRaw } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, ai_score, ai_category, pipeline_stage, primary_request_id, created_at')
    .eq('questionnaire_status', 'completed')
    .eq('test_task_status', 'not_sent')
    .eq('is_blacklisted', false)
    .order('created_at', { ascending: false });
  const questionnaireCandidates = (questionnaireRaw || []) as unknown as CandidateRow[];

  // 4. Test submitted, no final decision
  const { data: testRaw } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, ai_score, ai_category, pipeline_stage, primary_request_id, created_at, test_task_submitted_at')
    .in('test_task_status', ['submitted_on_time', 'submitted_late', 'evaluating', 'evaluated'])
    .eq('is_blacklisted', false)
    .order('test_task_submitted_at', { ascending: false });
  let testCandidates = (testRaw || []) as unknown as CandidateRow[];

  // Filter test candidates without final_decision
  if (testCandidates.length > 0) {
    const testIds = testCandidates.map((c) => c.id);
    const { data: matchesRaw } = await supabase
      .from('candidate_request_matches')
      .select('candidate_id')
      .in('candidate_id', testIds)
      .not('final_decision', 'is', null);
    const matches = (matchesRaw || []) as unknown as MatchRow[];
    const decidedIds = new Set(matches.map((m) => m.candidate_id).filter(Boolean) as string[]);
    testCandidates = testCandidates.filter((c) => !decidedIds.has(c.id));
  }

  // Collect unique primary_request_ids and fetch titles
  const allCandidates = [...newCandidates, ...analyzedCandidates, ...questionnaireCandidates, ...testCandidates];
  const requestIds = [...new Set(allCandidates.map((c) => c.primary_request_id).filter(Boolean) as string[])];

  let requestTitles: Record<string, string> = {};
  if (requestIds.length > 0) {
    const { data: requestsRaw } = await supabase
      .from('requests')
      .select('id, title')
      .in('id', requestIds);
    const requests = (requestsRaw || []) as unknown as RequestRow[];
    requestTitles = Object.fromEntries(requests.map((r) => [r.id, r.title]));
  }

  // Questionnaire submitted_at
  const questionnaireIds = questionnaireCandidates.map((c) => c.id);
  const questionnaireSubmittedAt: Record<string, string> = {};
  if (questionnaireIds.length > 0) {
    const { data: qRaw } = await supabase
      .from('questionnaire_responses')
      .select('candidate_id, submitted_at')
      .in('candidate_id', questionnaireIds)
      .eq('status', 'completed')
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false });
    const qResponses = (qRaw || []) as unknown as QuestionnaireRow[];
    for (const qr of qResponses) {
      if (!questionnaireSubmittedAt[qr.candidate_id] && qr.submitted_at) {
        questionnaireSubmittedAt[qr.candidate_id] = qr.submitted_at;
      }
    }
  }

  const mapCandidate = (c: CandidateRow, eventAt: string) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    ai_score: c.ai_score,
    ai_category: c.ai_category,
    pipeline_stage: c.pipeline_stage,
    primary_request_title: c.primary_request_id ? (requestTitles[c.primary_request_id] ?? null) : null,
    event_at: eventAt,
  });

  return NextResponse.json({
    new: newCandidates.map((c) => mapCandidate(c, c.created_at)),
    analyzed: analyzedCandidates.map((c) => mapCandidate(c, c.created_at)),
    questionnaire: questionnaireCandidates.map((c) =>
      mapCandidate(c, questionnaireSubmittedAt[c.id] ?? c.created_at)
    ),
    test: testCandidates.map((c) =>
      mapCandidate(c, c.test_task_submitted_at ?? c.created_at)
    ),
  });
}
