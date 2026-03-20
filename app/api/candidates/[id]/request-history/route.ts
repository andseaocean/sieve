import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';

// GET vacancy change history for a candidate
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: candidateId } = await context.params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('candidate_request_history')
    .select(`
      id,
      from_request_id,
      to_request_id,
      reason,
      notes,
      created_at,
      managers(name),
      from_request:requests!candidate_request_history_from_request_id_fkey(title),
      to_request:requests!candidate_request_history_to_request_id_fkey(title)
    `)
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching request history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (data ?? []).map((row: {
    id: string;
    from_request_id: string | null;
    to_request_id: string | null;
    reason: string;
    notes: string | null;
    created_at: string;
    managers: { name: string } | null;
    from_request: { title: string } | null;
    to_request: { title: string } | null;
  }) => ({
    id: row.id,
    from_request_id: row.from_request_id,
    to_request_id: row.to_request_id,
    from_request_title: row.from_request?.title ?? null,
    to_request_title: row.to_request?.title ?? null,
    changed_by_name: row.managers?.name ?? null,
    reason: row.reason,
    notes: row.notes,
    created_at: row.created_at,
  }));

  return NextResponse.json(result);
}
