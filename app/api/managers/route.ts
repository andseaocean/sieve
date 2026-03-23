import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';

// GET /api/managers — list all (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('managers')
      .select('id, name, email, role, is_active, created_at')
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (e) {
    console.error('GET /api/managers:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/managers — create (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, email, password, role } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Ім'я обов'язкове" }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email обов\'язковий' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Пароль мінімум 8 символів' }, { status: 400 });
    }
    if (!['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Невірна роль' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check email uniqueness
    const { data: existing } = await supabase
      .from('managers')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Менеджер з таким email вже існує' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('managers')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash,
        role,
        is_active: true,
      } as never)
      .select('id, name, email, role, is_active, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error('POST /api/managers:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
