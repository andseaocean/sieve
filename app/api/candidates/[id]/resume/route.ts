import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';

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
    const supabase = createServiceRoleClient();

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

    // Extract storage file path from the Supabase public URL
    let pdfBuffer: ArrayBuffer;
    const resumeUrl = candidate.resume_url;

    // Try multiple URL patterns to extract the storage path
    let storagePath: string | null = null;
    const patterns = [
      '/storage/v1/object/public/resumes/',
      '/storage/v1/object/sign/resumes/',
      '/storage/v1/object/resumes/',
    ];
    for (const prefix of patterns) {
      if (resumeUrl.includes(prefix)) {
        storagePath = resumeUrl.split(prefix)[1]?.split('?')[0] || null;
        break;
      }
    }

    if (storagePath) {
      // Download via Supabase SDK (works regardless of bucket visibility)
      const decodedPath = decodeURIComponent(storagePath);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('resumes')
        .download(decodedPath);

      if (downloadError || !fileData) {
        return NextResponse.json(
          {
            error: 'Failed to download resume from storage',
            details: downloadError?.message,
            storagePath: decodedPath,
            resumeUrl,
          },
          { status: 500 }
        );
      }
      pdfBuffer = await fileData.arrayBuffer();
    } else {
      // Fallback: direct fetch (for non-Supabase or old-format URLs)
      const response = await fetch(resumeUrl);
      if (!response.ok) {
        return NextResponse.json(
          {
            error: 'Failed to fetch resume via URL',
            status: response.status,
            resumeUrl,
          },
          { status: 500 }
        );
      }
      pdfBuffer = await response.arrayBuffer();
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent(`${candidate.first_name}_${candidate.last_name}_Resume.pdf`)}`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving resume:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined,
      },
      { status: 500 }
    );
  }
}
