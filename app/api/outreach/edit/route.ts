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
    const { outreachId, introMessage, scheduledFor } = body;

    if (!outreachId) {
      return NextResponse.json({ error: 'outreachId required' }, { status: 400 });
    }

    if (!introMessage && !scheduledFor) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Add manager edit tracking if we have user info
    if (session.user?.id) {
      updateData.edited_by = session.user.id;
      updateData.edited_at = new Date().toISOString();
    }

    if (introMessage) {
      updateData.intro_message = introMessage;
    }

    if (scheduledFor) {
      updateData.scheduled_for = scheduledFor;
    }

    const { data, error } = await supabase
      .from('outreach_queue')
      .update(updateData as never)
      .eq('id', outreachId)
      .eq('status', 'scheduled') // Can only edit scheduled messages
      .select()
      .single();

    if (error) {
      console.error('Error updating outreach:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Outreach not found or already processed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, outreach: data });
  } catch (error) {
    console.error('Error in POST /api/outreach/edit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
