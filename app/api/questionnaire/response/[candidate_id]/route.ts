import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';

// GET questionnaire results for a candidate (protected)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ candidate_id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidate_id } = await params;
    const supabase = createServerClient();

    // Get the latest questionnaire response for this candidate
    const { data, error } = await supabase
      .from('questionnaire_responses' as never)
      .select('*')
      .eq('candidate_id', candidate_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'No questionnaire found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/questionnaire/response/[candidate_id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
