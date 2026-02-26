import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';
import type { SoftSkillCompetency, QuestionnaireQuestion } from '@/lib/supabase/types';

// GET all competencies with their questions
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: competenciesData, error: compError } = await supabase
      .from('soft_skill_competencies' as never)
      .select('*')
      .order('created_at', { ascending: true });

    if (compError) {
      return NextResponse.json({ error: compError.message }, { status: 500 });
    }

    const { data: questionsData, error: qError } = await supabase
      .from('questionnaire_questions' as never)
      .select('*')
      .order('created_at', { ascending: true });

    if (qError) {
      return NextResponse.json({ error: qError.message }, { status: 500 });
    }

    const competencies = (competenciesData || []) as unknown as SoftSkillCompetency[];
    const questions = (questionsData || []) as unknown as QuestionnaireQuestion[];

    // Group questions by competency
    const result = competencies.map(comp => ({
      ...comp,
      questions: questions.filter(q => q.competency_id === comp.id),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/questionnaire/competencies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new competency
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('soft_skill_competencies' as never)
      .insert({ name, description: description || null } as never)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/questionnaire/competencies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
