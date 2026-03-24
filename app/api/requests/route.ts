import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { RequestInsert } from '@/lib/supabase/types';

// GET all requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = request.nextUrl.searchParams.get('filter');
    const supabase = createServiceRoleClient();

    let query = supabase
      .from('requests')
      .select(`
        *,
        created_by_manager:managers!created_by(id, name),
        request_managers(manager_id)
      `)
      .order('created_at', { ascending: false });

    if (filter === 'mine') {
      const { data: managed } = await supabase
        .from('request_managers')
        .select('request_id')
        .eq('manager_id', session.user.id);

      const managedIds = (managed as { request_id: string }[] | null)?.map((r) => r.request_id) ?? [];

      if (managedIds.length > 0) {
        query = query.or(
          `created_by.eq.${session.user.id},id.in.(${managedIds.join(',')})`
        );
      } else {
        query = query.eq('created_by', session.user.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching requests:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const newRequest: RequestInsert = {
      manager_id: session.user.id,
      created_by: session.user.id,
      title: body.title,
      description: body.description || null,
      required_skills: body.required_skills,
      nice_to_have_skills: body.nice_to_have_skills || null,
      soft_skills: body.soft_skills,
      ai_orientation: body.ai_orientation || 'preferred',
      red_flags: body.red_flags || null,
      location: body.location || null,
      employment_type: body.employment_type || 'not_specified',
      remote_policy: body.remote_policy || 'not_specified',
      priority: body.priority || 'medium',
      status: body.status || 'active',
      qualification_questions: body.qualification_questions || [],
      test_task_url: body.test_task_url || null,
      test_task_deadline_days: body.test_task_deadline_days || 3,
      test_task_message: body.test_task_message || null,
      test_task_evaluation_criteria: body.test_task_evaluation_criteria || null,
      job_description: body.job_description || null,
      questionnaire_competency_ids: body.questionnaire_competency_ids || [],
      questionnaire_question_ids: body.questionnaire_question_ids || [],
      questionnaire_custom_questions: body.questionnaire_custom_questions || [],
      salary_range: body.salary_range || null,
      vacancy_info: body.vacancy_info || null,
    };

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('requests')
      .insert(newRequest as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const createdRequest = data as { id: string };

    // Auto-add creator as first manager
    const { error: rmError } = await supabase.from('request_managers').insert({
      request_id: createdRequest.id,
      manager_id: session.user.id,
      added_by: session.user.id,
    } as never);

    if (rmError) {
      console.error('Error adding creator to request_managers:', rmError);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
