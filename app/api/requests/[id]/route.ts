import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';

// GET single request
export async function GET(
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
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/requests/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH update request
export async function PATCH(
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

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.required_skills !== undefined) updateData.required_skills = body.required_skills;
    if (body.nice_to_have_skills !== undefined) updateData.nice_to_have_skills = body.nice_to_have_skills;
    if (body.soft_skills !== undefined) updateData.soft_skills = body.soft_skills;
    if (body.ai_orientation !== undefined) updateData.ai_orientation = body.ai_orientation;
    if (body.red_flags !== undefined) updateData.red_flags = body.red_flags;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.employment_type !== undefined) updateData.employment_type = body.employment_type;
    if (body.remote_policy !== undefined) updateData.remote_policy = body.remote_policy;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.qualification_questions !== undefined) updateData.qualification_questions = body.qualification_questions;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('requests')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PATCH /api/requests/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE request
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
    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/requests/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
