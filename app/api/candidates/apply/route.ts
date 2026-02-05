import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { analyzeWithClaude, parseAIAnalysisResult, parseAIMatchResult, MOCK_ANALYSIS_RESULT, MOCK_MATCH_RESULT, AIAnalysisResult } from '@/lib/ai/claude';
import { GENERAL_CANDIDATE_ANALYSIS_PROMPT, MATCH_CANDIDATE_TO_REQUEST_PROMPT } from '@/lib/ai/prompts';
import { Candidate, Request } from '@/lib/supabase/types';
import { translateCandidateContent } from '@/lib/translation';
import { scheduleOutreachAfterAnalysis } from '@/lib/outreach/schedule-outreach';

const USE_MOCK_AI = process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY;

// Background function to run AI analysis
async function runBackgroundAIAnalysis(candidateId: string) {
  try {
    const supabase = createServerClient();

    // Fetch the candidate
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidateData) {
      console.error('Background AI: Candidate not found', candidateId);
      return;
    }

    const candidate = candidateData as Candidate & {
      about_text_translated?: string;
      why_vamos_translated?: string;
      key_skills_translated?: string;
      original_language?: string;
    };

    // Create a modified candidate object for AI analysis using translated content
    const candidateForAnalysis = {
      ...candidate,
      // Use translated content if available, otherwise fall back to original
      about_text: candidate.about_text_translated || candidate.about_text,
      why_vamos: candidate.why_vamos_translated || candidate.why_vamos,
    };

    // Run AI analysis
    let analysis;
    if (USE_MOCK_AI) {
      console.log('Background AI: Using mock analysis for candidate', candidateId);
      analysis = MOCK_ANALYSIS_RESULT;
    } else {
      console.log('Background AI: Running Claude analysis for candidate', candidateId);
      const prompt = GENERAL_CANDIDATE_ANALYSIS_PROMPT(candidateForAnalysis as Candidate);
      const response = await analyzeWithClaude(prompt);
      analysis = parseAIAnalysisResult(response);
    }

    // Update candidate with AI results
    await supabase
      .from('candidates')
      .update({
        ai_score: analysis.score,
        ai_category: analysis.category,
        ai_summary: analysis.summary,
      } as never)
      .eq('id', candidateId);

    console.log('Background AI: Analysis complete for candidate', candidateId);

    // Now match to all active requests
    const { data: requestsData } = await supabase
      .from('requests')
      .select('*')
      .eq('status', 'open');

    if (requestsData && requestsData.length > 0) {
      console.log(`Background AI: Matching candidate to ${requestsData.length} open requests`);

      for (const requestData of requestsData) {
        const request = requestData as Request;

        const candidateAnalysis = {
          score: analysis.score,
          category: analysis.category,
          summary: analysis.summary,
          strengths: analysis.strengths || [],
        };

        let matchResult;
        if (USE_MOCK_AI) {
          matchResult = MOCK_MATCH_RESULT;
        } else {
          const matchPrompt = MATCH_CANDIDATE_TO_REQUEST_PROMPT(candidateForAnalysis as Candidate, candidateAnalysis, request);
          const matchResponse = await analyzeWithClaude(matchPrompt);
          matchResult = parseAIMatchResult(matchResponse);
        }

        // Check if match already exists
        const { data: existingMatchData } = await supabase
          .from('candidate_request_matches')
          .select('id')
          .eq('candidate_id', candidateId)
          .eq('request_id', request.id)
          .single();

        const existingMatch = existingMatchData as { id: string } | null;

        if (existingMatch) {
          await supabase
            .from('candidate_request_matches')
            .update({
              match_score: matchResult.match_score,
              match_explanation: `${matchResult.alignment}\n\nMissing: ${matchResult.missing}`,
            } as never)
            .eq('id', existingMatch.id);
        } else {
          await supabase
            .from('candidate_request_matches')
            .insert({
              candidate_id: candidateId,
              request_id: request.id,
              match_score: matchResult.match_score,
              match_explanation: `${matchResult.alignment}\n\nMissing: ${matchResult.missing}`,
              status: 'new',
            } as never);
        }

        console.log(`Background AI: Match created for request ${request.id} with score ${matchResult.match_score}`);
      }

      // Find best match for outreach (score >= 60)
      const { data: bestMatchData } = await supabase
        .from('candidate_request_matches')
        .select('match_score, requests(*)')
        .eq('candidate_id', candidateId)
        .order('match_score', { ascending: false })
        .limit(1)
        .single();

      let bestMatch: { request: Request; match_score: number } | undefined;
      const matchData = bestMatchData as { match_score: number | null; requests: unknown } | null;
      if (matchData && matchData.match_score && matchData.match_score >= 60) {
        bestMatch = {
          request: matchData.requests as Request,
          match_score: matchData.match_score,
        };
      }

      // Schedule outreach for warm candidates with high scores
      const outreachAnalysis: AIAnalysisResult = {
        score: analysis.score,
        category: analysis.category,
        summary: analysis.summary,
        strengths: analysis.strengths || [],
        concerns: analysis.concerns || [],
        recommendation: analysis.recommendation,
        reasoning: analysis.reasoning,
      };

      await scheduleOutreachAfterAnalysis({
        candidateId,
        analysis: outreachAnalysis,
        bestMatch,
      });
    }

    console.log('Background AI: All processing complete for candidate', candidateId);
  } catch (error) {
    console.error('Background AI: Error processing candidate', candidateId, error);
  }
}

// Background function to translate candidate content
async function runBackgroundTranslation(candidateId: string, originalLanguage: string) {
  try {
    const supabase = createServerClient();

    // Fetch the candidate
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidateData) {
      console.error('Background Translation: Candidate not found', candidateId);
      return;
    }

    const candidate = candidateData as Candidate;

    // If already Ukrainian, just copy original to translated fields
    if (originalLanguage === 'uk') {
      await supabase
        .from('candidates')
        .update({
          about_text_translated: candidate.about_text,
          why_vamos_translated: candidate.why_vamos,
          key_skills_translated: Array.isArray(candidate.key_skills)
            ? candidate.key_skills.join(', ')
            : candidate.key_skills,
          translated_to: 'uk',
        } as never)
        .eq('id', candidateId);

      console.log('Background Translation: Ukrainian content copied for candidate', candidateId);
      return;
    }

    console.log(`Background Translation: Translating from ${originalLanguage} to Ukrainian for candidate`, candidateId);

    // Translate content to Ukrainian
    const translated = await translateCandidateContent({
      from: originalLanguage,
      to: 'uk',
      texts: {
        bio: candidate.about_text || undefined,
        why_vamos: candidate.why_vamos || undefined,
        skills: Array.isArray(candidate.key_skills)
          ? candidate.key_skills.join(', ')
          : (candidate.key_skills || undefined),
      },
    });

    // Update candidate with translated content
    await supabase
      .from('candidates')
      .update({
        about_text_translated: translated.bio_translated || candidate.about_text,
        why_vamos_translated: translated.why_vamos_translated || candidate.why_vamos,
        key_skills_translated: translated.skills_translated || (Array.isArray(candidate.key_skills)
          ? candidate.key_skills.join(', ')
          : candidate.key_skills),
        translated_to: 'uk',
      } as never)
      .eq('id', candidateId);

    console.log('Background Translation: Translation complete for candidate', candidateId);
  } catch (error) {
    console.error('Background Translation: Error translating candidate', candidateId, error);
  }
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

    // First run translation (non-blocking), then AI analysis
    // Translation should complete first so AI can use translated content
    setTimeout(async () => {
      await runBackgroundTranslation(candidate.id, original_language);
      // Run AI analysis after translation completes
      runBackgroundAIAnalysis(candidate.id);
    }, 0);

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
