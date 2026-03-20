import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';

// Public endpoint — no auth required
// Returns open (active) vacancies for the application form
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('requests')
      .select('id, title, location, employment_type, salary_range')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching open requests:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('Error in GET /api/requests/open:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
