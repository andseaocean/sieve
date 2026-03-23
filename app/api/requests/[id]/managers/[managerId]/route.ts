import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';

// DELETE — remove manager from vacancy
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; managerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, managerId } = await params;
    const supabase = createServiceRoleClient();

    // Check if managerId is the request author — cannot remove
    const { data: req } = await supabase
      .from('requests')
      .select('created_by')
      .eq('id', id)
      .single();

    if ((req as { created_by: string | null } | null)?.created_by === managerId) {
      return NextResponse.json(
        { error: 'Не можна видалити автора вакансії' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('request_managers')
      .delete()
      .eq('request_id', id)
      .eq('manager_id', managerId);

    if (error) {
      console.error('Error removing manager:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/requests/[id]/managers/[managerId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
