import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';

// GET matched vacancies for a candidate (for the "Також може підійти" block)
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: candidateId } = await context.params;
  const supabase = createServerClient();

  // Fetch candidate_request_matches joined with requests title
  const { data, error } = await supabase
    .from('candidate_request_matches')
    .select('request_id, match_score, requests(title)')
    .eq('candidate_id', candidateId)
    .order('match_score', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (data ?? []).map((row: { request_id: string; match_score: number; requests: { title: string } | null }) => ({
    request_id: row.request_id,
    match_score: row.match_score,
    request_title: row.requests?.title ?? 'Невідома вакансія',
  }));

  return NextResponse.json(result);
}
