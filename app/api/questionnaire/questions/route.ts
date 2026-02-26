import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';

// POST create new question
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { competency_id, text, is_universal } = await request.json();

    if (!competency_id || !text?.trim()) {
      return NextResponse.json({ error: 'competency_id and text are required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('questionnaire_questions' as never)
      .insert({
        competency_id,
        text,
        is_universal: is_universal !== false,
      } as never)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/questionnaire/questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
