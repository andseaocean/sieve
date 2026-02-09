import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';
import { RequestInsert } from '@/lib/supabase/types';

// GET all requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });

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
    };

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('requests')
      .insert(newRequest as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
