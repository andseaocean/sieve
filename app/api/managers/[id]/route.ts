import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';

// PUT /api/managers/[id] — update (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const currentUserId = session.user.id;

    // Guard: cannot deactivate yourself
    if (id === currentUserId && body.is_active === false) {
      return NextResponse.json(
        { error: 'Не можна деактивувати себе' },
        { status: 403 }
      );
    }

    // Guard: cannot downgrade your own role
    if (id === currentUserId && body.role === 'manager') {
      return NextResponse.json(
        { error: 'Не можна змінити свою роль' },
        { status: 403 }
      );
    }

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.email !== undefined) update.email = body.email.trim().toLowerCase();
    if (body.role !== undefined) update.role = body.role;
    if (body.is_active !== undefined) update.is_active = body.is_active;
    if (body.password) {
      if (body.password.length < 8) {
        return NextResponse.json({ error: 'Пароль мінімум 8 символів' }, { status: 400 });
      }
      update.password_hash = await bcrypt.hash(body.password, 10);
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('managers')
      .update(update as never)
      .eq('id', id)
      .select('id, name, email, role, is_active, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (e) {
    console.error('PUT /api/managers/[id]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
