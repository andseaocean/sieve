import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';
import { processOutreachItem } from '@/lib/outreach/processor';
import { Candidate, OutreachQueue } from '@/lib/supabase/types';

interface OutreachItemWithCandidate extends OutreachQueue {
  candidates: Candidate;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { outreachId } = body;

    if (!outreachId) {
      return NextResponse.json({ error: 'outreachId required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch the outreach item with candidate data
    const { data: outreach, error: fetchError } = await supabase
      .from('outreach_queue')
      .select('*, candidates(*)')
      .eq('id', outreachId)
      .eq('status', 'scheduled')
      .single();

    if (fetchError || !outreach) {
      return NextResponse.json(
        { error: 'Outreach not found or already processed' },
        { status: 404 }
      );
    }

    // Process immediately
    const result = await processOutreachItem(outreach as OutreachItemWithCandidate);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send message',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/outreach/send-now:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
