import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';
import type { QuestionnaireResponse } from '@/lib/supabase/types';

// GET questionnaire data by token (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createServiceRoleClient();

    const { data: responseData, error } = await supabase
      .from('questionnaire_responses' as never)
      .select('*')
      .eq('token', token)
      .single();

    if (error || !responseData) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const response = responseData as unknown as QuestionnaireResponse;

    // Check expiry
    if (response.expires_at && new Date(response.expires_at) < new Date()) {
      // Update status to expired if not already
      if (response.status !== 'expired' && response.status !== 'completed') {
        await supabase
          .from('questionnaire_responses' as never)
          .update({ status: 'expired' } as never)
          .eq('id', response.id);

        await supabase
          .from('candidates')
          .update({ questionnaire_status: 'expired' } as never)
          .eq('id', response.candidate_id);
      }
      return NextResponse.json({ status: 'expired', expires_at: response.expires_at });
    }

    // Already completed
    if (response.status === 'completed') {
      return NextResponse.json({ status: 'completed' });
    }

    return NextResponse.json({
      status: response.status,
      questions: response.questions,
      expires_at: response.expires_at,
      company_name: 'Vamos',
    });
  } catch (error) {
    console.error('Error in GET /api/questionnaire/[token]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
