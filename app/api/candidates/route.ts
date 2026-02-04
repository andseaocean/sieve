import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';

// GET all candidates with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const supabase = createServerClient();
    let query = supabase.from('candidates').select('*');

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('ai_category', category);
    }

    if (source && source !== 'all') {
      query = query.eq('source', source);
    }

    if (minScore) {
      query = query.gte('ai_score', parseFloat(minScore));
    }

    if (maxScore) {
      query = query.lte('ai_score', parseFloat(maxScore));
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching candidates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/candidates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
