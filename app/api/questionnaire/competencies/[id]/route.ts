import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';
import type { QuestionnaireQuestion } from '@/lib/supabase/types';

// PUT update competency
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('soft_skill_competencies' as never)
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/questionnaire/competencies/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE competency (soft delete — deactivate)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerClient();

    // Check if competency has questions
    const { data: questionsData } = await supabase
      .from('questionnaire_questions' as never)
      .select('id')
      .eq('competency_id', id)
      .eq('is_active', true)
      .limit(1);

    const questions = (questionsData || []) as unknown as QuestionnaireQuestion[];

    if (questions.length > 0) {
      // Deactivate instead of delete
      const { error } = await supabase
        .from('soft_skill_competencies' as never)
        .update({ is_active: false, updated_at: new Date().toISOString() } as never)
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: 'Competency deactivated' });
    }

    // No active questions — safe to delete
    const { error } = await supabase
      .from('soft_skill_competencies' as never)
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Competency deleted' });
  } catch (error) {
    console.error('Error in DELETE /api/questionnaire/competencies/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
