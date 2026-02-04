import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: requestId } = await params;
    const supabase = createServerClient();

    // Fetch matches for this request with candidate data
    const { data: matchesData, error } = await supabase
      .from('candidate_request_matches')
      .select(`
        id,
        match_score,
        match_explanation,
        status,
        manager_notes,
        created_at,
        updated_at,
        candidates (
          id,
          first_name,
          last_name,
          email,
          phone,
          linkedin_url,
          ai_score,
          ai_category,
          ai_summary,
          key_skills
        )
      `)
      .eq('request_id', requestId)
      .order('match_score', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching matches:', error);
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    // Transform data to flatten candidate info
    interface MatchRow {
      id: string;
      match_score: number | null;
      match_explanation: string | null;
      status: string;
      manager_notes: string | null;
      created_at: string;
      updated_at: string;
      candidates: unknown;
    }

    const matches = ((matchesData || []) as MatchRow[]).map((match) => ({
      id: match.id,
      match_score: match.match_score,
      match_explanation: match.match_explanation,
      status: match.status,
      manager_notes: match.manager_notes,
      created_at: match.created_at,
      updated_at: match.updated_at,
      candidate: match.candidates,
    }));

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Error in GET /api/requests/[id]/matches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
