import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { outreachId, candidateId } = body;

    if (!outreachId && !candidateId) {
      return NextResponse.json(
        { error: 'outreachId or candidateId required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();

    // Build query based on provided parameter
    let query = supabase
      .from('outreach_queue')
      .update({
        status: 'cancelled',
        updated_at: now,
      } as never)
      .eq('status', 'scheduled'); // Can only cancel scheduled items

    if (outreachId) {
      query = query.eq('id', outreachId);
    } else {
      query = query.eq('candidate_id', candidateId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      // Check if it's a "no rows" error (item already processed)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Outreach not found or already processed' },
          { status: 404 }
        );
      }
      console.error('Error cancelling outreach:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update candidate status if we found and cancelled an outreach
    const outreachData = data as { candidate_id: string } | null;
    if (outreachData) {
      await supabase
        .from('candidates')
        .update({
          outreach_status: 'cancelled',
        } as never)
        .eq('id', outreachData.candidate_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/outreach/cancel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
