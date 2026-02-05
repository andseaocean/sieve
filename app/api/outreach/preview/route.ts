import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';
import { formatScheduledTime } from '@/lib/outreach/scheduler';
import { OutreachQueue, Candidate, Request } from '@/lib/supabase/types';

interface OutreachWithRelations extends OutreachQueue {
  candidates: Candidate;
  requests: Request | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId');

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch outreach queue entry with candidate and request data
    const { data: outreach, error } = await supabase
      .from('outreach_queue')
      .select(`
        *,
        candidates(*),
        requests(*)
      `)
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !outreach) {
      return NextResponse.json({
        hasOutreach: false,
        message: 'No outreach scheduled for this candidate',
      });
    }

    const outreachData = outreach as unknown as OutreachWithRelations;

    return NextResponse.json({
      hasOutreach: true,
      outreach: {
        id: outreachData.id,
        introMessage: outreachData.intro_message,
        testTaskMessage: outreachData.test_task_message,
        deliveryMethod: outreachData.delivery_method,
        scheduledFor: outreachData.scheduled_for,
        scheduledForDisplay: formatScheduledTime(new Date(outreachData.scheduled_for)),
        status: outreachData.status,
        sentAt: outreachData.sent_at,
        errorMessage: outreachData.error_message,
        editedBy: outreachData.edited_by,
        editedAt: outreachData.edited_at,
        createdAt: outreachData.created_at,
      },
      candidate: outreachData.candidates,
      request: outreachData.requests,
    });
  } catch (error) {
    console.error('Error in GET /api/outreach/preview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
