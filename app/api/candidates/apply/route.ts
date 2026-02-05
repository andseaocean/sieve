import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { Candidate } from '@/lib/supabase/types';

/**
 * Trigger background AI analysis via internal API call.
 * This is fire-and-forget - we don't wait for the result.
 */
function triggerBackgroundAnalysis(candidateId: string, baseUrl: string) {
  const internalSecret = process.env.INTERNAL_API_SECRET || 'default-secret';

  // Fire-and-forget call to background analysis endpoint
  fetch(`${baseUrl}/api/candidates/${candidateId}/analyze-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret,
    },
  }).then((res) => {
    if (!res.ok) {
      console.error(`Background analysis trigger failed for ${candidateId}: ${res.status}`);
    } else {
      console.log(`Background analysis triggered successfully for ${candidateId}`);
    }
  }).catch((error) => {
    console.error(`Background analysis trigger error for ${candidateId}:`, error);
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract form fields
    const first_name = formData.get('first_name') as string;
    const last_name = formData.get('last_name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string | null;
    const about_text = formData.get('about_text') as string;
    const why_vamos = formData.get('why_vamos') as string;
    const key_skills_string = formData.get('key_skills') as string | null;
    const linkedin_url = formData.get('linkedin_url') as string | null;
    const portfolio_url = formData.get('portfolio_url') as string | null;
    const resumeFile = formData.get('resume') as File | null;

    // Contact preferences
    const preferred_contact_methods_raw = formData.get('preferred_contact_methods') as string | null;
    const telegram_username = formData.get('telegram_username') as string | null;

    // Parse contact methods (defaults to email if not provided)
    const preferred_contact_methods = preferred_contact_methods_raw
      ? JSON.parse(preferred_contact_methods_raw) as ('email' | 'telegram')[]
      : ['email'];

    // Get the original language from the form (defaults to 'en')
    const original_language = (formData.get('original_language') as string) || 'en';

    // Validate required fields
    if (!first_name || !last_name || !email || !about_text || !why_vamos) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse skills from comma-separated string
    const key_skills = key_skills_string
      ? key_skills_string.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const supabase = createServerClient();

    // Check if candidate with this email already exists
    const { data: existingCandidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('email', email)
      .single();

    if (existingCandidate) {
      return NextResponse.json(
        { error: 'Кандидат з таким email вже зареєстрований' },
        { status: 400 }
      );
    }

    // Upload resume if provided
    let resume_url: string | null = null;
    if (resumeFile && resumeFile.size > 0) {
      const fileName = `${Date.now()}_${resumeFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, resumeFile);

      if (uploadError) {
        console.error('Error uploading resume:', uploadError);
        // Continue without resume if upload fails
      } else if (uploadData) {
        const { data: urlData } = supabase.storage
          .from('resumes')
          .getPublicUrl(uploadData.path);
        resume_url = urlData.publicUrl;
      }
    }

    // Create candidate record with language tracking
    const { data: candidateData, error: insertError } = await supabase
      .from('candidates')
      .insert({
        first_name,
        last_name,
        email,
        phone: phone || null,
        about_text,
        why_vamos,
        key_skills,
        linkedin_url: linkedin_url || null,
        portfolio_url: portfolio_url || null,
        resume_url,
        source: 'warm', // Public form is "warm" source (candidate applied themselves)
        original_language, // Track the original submission language
        // Outreach fields
        preferred_contact_methods,
        telegram_username: telegram_username || null,
        outreach_status: 'pending',
      } as never)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating candidate:', insertError);
      return NextResponse.json(
        { error: 'Failed to create candidate record' },
        { status: 500 }
      );
    }

    const candidate = candidateData as Candidate;

    // Get base URL for internal API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Trigger background AI analysis (fire-and-forget)
    // This runs translation + AI analysis + matching in the background
    triggerBackgroundAnalysis(candidate.id, baseUrl);

    return NextResponse.json({
      success: true,
      message: 'Заявку успішно надіслано',
      candidate_id: candidate.id,
    });
  } catch (error) {
    console.error('Error in POST /api/candidates/apply:', error);
    return NextResponse.json(
      { error: 'Failed to process application' },
      { status: 500 }
    );
  }
}
