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

    const { id: candidateId } = await params;
    const supabase = createServerClient();

    const { data } = await supabase
      .from('candidate_request_matches')
      .select('request_id, final_decision, final_decision_at, match_score')
      .eq('candidate_id', candidateId)
      .order('match_score', { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return NextResponse.json({ request_id: null, final_decision: null });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ request_id: null, final_decision: null });
  }
}
