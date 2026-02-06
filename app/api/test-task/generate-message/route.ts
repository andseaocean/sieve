import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';
import { generateTestTaskMessage } from '@/lib/outreach/message-generator';
import { Candidate, Request } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, requestId } = await request.json();

    const supabase = createServerClient();

    // Get candidate
    const { data: candidateData, error: candError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    const candidate = candidateData as Candidate | null;

    if (candError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Get request
    const { data: reqData, error: reqError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .single();

    const req = reqData as Request | null;

    if (reqError || !req || !req.test_task_url) {
      return NextResponse.json({ error: 'Request or test task not configured' }, { status: 404 });
    }

    // Generate message using existing message generator
    const message = await generateTestTaskMessage(
      candidate,
      req,
      req.test_task_url
    );

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error generating test task message:', error);
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    );
  }
}
