import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';

// POST — add manager to vacancy
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { manager_id } = await request.json();

    if (!manager_id) {
      return NextResponse.json({ error: 'manager_id is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Upsert — ignore conflict (already added)
    const { error } = await supabase
      .from('request_managers')
      .upsert(
        { request_id: id, manager_id, added_by: session.user.id } as never,
        { onConflict: 'request_id,manager_id', ignoreDuplicates: true }
      );

    if (error) {
      console.error('Error adding manager:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/requests/[id]/managers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
