import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { Candidate } from '@/lib/supabase/types';

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

    const supabase = createServiceRoleClient();

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
    let resumeBuffer: Buffer | null = null;

    if (resumeFile && resumeFile.size > 0) {
      // Read file buffer once — use for both upload and parsing
      const arrayBuffer = await resumeFile.arrayBuffer();
      resumeBuffer = Buffer.from(arrayBuffer);

      const fileName = `${Date.now()}_${resumeFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, resumeBuffer, {
          contentType: 'application/pdf',
        });

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

    // Create candidate record (always — even if PDF parsing fails later)
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
        source: 'warm',
        original_language,
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

    // Parse PDF text AFTER candidate is created (non-blocking)
    if (resume_url && resumeBuffer) {
      try {
        const { parsePDFFromBuffer } = await import('@/lib/pdf/parser');
        const { text, pages, size } = await parsePDFFromBuffer(resumeBuffer);

        await supabase
          .from('candidates')
          .update({
            resume_extracted_data: {
              fullText: text.slice(0, 50000),
              extracted: { experience: [], skills: [], education: [] },
              metadata: { pages, size },
            },
          } as never)
          .eq('id', candidate.id);

        console.log('Resume PDF parsed successfully:', { pages, textLength: text.length });
      } catch (pdfError) {
        console.error('Failed to parse resume PDF (non-blocking):', pdfError);
        // Candidate already created — PDF parsing will happen in analyze-background
      }
    }

    // Add candidate to AI analysis queue (processed by cron job)
    const { error: queueError } = await supabase
      .from('ai_analysis_queue')
      .insert({
        candidate_id: candidate.id,
        status: 'pending',
      } as never);

    if (queueError) {
      console.error('Error adding to AI analysis queue:', queueError);
    } else {
      console.log(`Candidate ${candidate.id} added to AI analysis queue`);
    }

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
