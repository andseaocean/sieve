import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';

/**
 * GET /api/candidates/[id]/resume
 * Проксі для перегляду PDF-резюме кандидата
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const supabase = createServerClient();

    const { data: candidateData, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !candidateData) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const candidate = candidateData as { resume_url: string | null; first_name: string; last_name: string };

    if (!candidate.resume_url) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    const response = await fetch(candidate.resume_url);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch resume' },
        { status: 500 }
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${candidate.first_name}_${candidate.last_name}_Resume.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving resume:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
