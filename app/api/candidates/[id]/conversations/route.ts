import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get('sort') === 'desc' ? false : true;

  const { data, error } = await supabase
    .from('candidate_conversations')
    .select('id, direction, message_type, content, sent_at, metadata')
    .eq('candidate_id', params.id)
    .order('sent_at', { ascending: sort });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
