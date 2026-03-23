import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: candidateId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason: string | undefined = body.reason;

    const supabase = createServiceRoleClient();

    // Get manager ID from session
    const { data: manager } = await supabase
      .from('managers')
      .select('id')
      .eq('email', session.user?.email || '')
      .single();

    const managerId = (manager as { id: string } | null)?.id || null;

    // Add to blacklist
    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        is_blacklisted: true,
        blacklisted_at: new Date().toISOString(),
        blacklisted_by: managerId,
        blacklist_reason: reason || null,
      } as never)
      .eq('id', candidateId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to blacklist candidate' }, { status: 500 });
    }

    // Cancel all pending automation jobs for this candidate
    await supabase
      .from('automation_queue')
      .update({ status: 'cancelled' } as never)
      .eq('candidate_id', candidateId)
      .in('status', ['pending', 'processing']);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error blacklisting candidate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: candidateId } = await params;

    const supabase = createServiceRoleClient();

    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        is_blacklisted: false,
        blacklisted_at: null,
        blacklisted_by: null,
        blacklist_reason: null,
      } as never)
      .eq('id', candidateId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to remove from blacklist' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing candidate from blacklist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
