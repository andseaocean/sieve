import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';
import type { QuestionnaireResponse } from '@/lib/supabase/types';

// POST mark questionnaire as started (public)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createServiceRoleClient();

    const { data: responseData, error } = await supabase
      .from('questionnaire_responses' as never)
      .select('id, status, candidate_id, expires_at')
      .eq('token', token)
      .single();

    if (error || !responseData) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const response = responseData as unknown as Pick<QuestionnaireResponse, 'id' | 'status' | 'candidate_id' | 'expires_at'>;

    // Check expiry
    if (response.expires_at && new Date(response.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 400 });
    }

    // Only update if still in 'sent' status
    if (response.status === 'sent') {
      await supabase
        .from('questionnaire_responses' as never)
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        } as never)
        .eq('id', response.id);

      await supabase
        .from('candidates')
        .update({ questionnaire_status: 'in_progress' } as never)
        .eq('id', response.candidate_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/questionnaire/[token]/start:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
