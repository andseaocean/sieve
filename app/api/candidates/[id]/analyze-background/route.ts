/**
 * API Endpoint: Background AI Analysis
 *
 * Runs AI analysis for a candidate in the background.
 * Called internally after candidate creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { analyzeWithClaude, parseAIAnalysisResult, parseAIMatchResult, MOCK_ANALYSIS_RESULT, MOCK_MATCH_RESULT } from '@/lib/ai/claude';
import { GENERAL_CANDIDATE_ANALYSIS_PROMPT, MATCH_CANDIDATE_TO_REQUEST_PROMPT } from '@/lib/ai/prompts';
import { translateCandidateContent } from '@/lib/translation';
import { Candidate, Request } from '@/lib/supabase/types';
import { parsePDFFromURL } from '@/lib/pdf/parser';
import { extractResumeData, formatResumeForAnalysis } from '@/lib/pdf/extractor';
import type { ResumeData } from '@/lib/pdf/types';

const USE_MOCK_AI = process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const candidateId = params.id;

  // Verify internal call with secret (optional security measure)
  const authHeader = request.headers.get('x-internal-secret');
  const internalSecret = process.env.INTERNAL_API_SECRET || 'default-secret';

  if (authHeader !== internalSecret) {
    console.warn('Unauthorized background analysis attempt for candidate', candidateId);
    // Still allow for now, but log it
  }

  try {
    const supabase = createServiceRoleClient();

    // Fetch the candidate
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidateData) {
      console.error('Background AI: Candidate not found', candidateId);
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const candidate = candidateData as Candidate & {
      about_text_translated?: string;
      why_vamos_translated?: string;
      key_skills_translated?: string;
      original_language?: string;
    };

    // Run translation first if needed
    if (candidate.original_language && candidate.original_language !== 'uk' && !candidate.about_text_translated) {
      console.log(`Background: Translating content for candidate ${candidateId}`);

      try {
        const translated = await translateCandidateContent({
          from: candidate.original_language,
          to: 'uk',
          texts: {
            bio: candidate.about_text || undefined,
            why_vamos: candidate.why_vamos || undefined,
            skills: Array.isArray(candidate.key_skills)
              ? candidate.key_skills.join(', ')
              : (candidate.key_skills || undefined),
          },
        });

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

        // Update local object for AI analysis
        (candidate as { about_text_translated?: string }).about_text_translated = translated.bio_translated || candidate.about_text || undefined;
        (candidate as { why_vamos_translated?: string }).why_vamos_translated = translated.why_vamos_translated || candidate.why_vamos || undefined;
      } catch (translationError) {
        console.error('Background: Translation failed, continuing with original content', translationError);
      }
    }

    // Create a modified candidate object for AI analysis using translated content
    const candidateForAnalysis = {
      ...candidate,
      about_text: candidate.about_text_translated || candidate.about_text,
      why_vamos: candidate.why_vamos_translated || candidate.why_vamos,
    };

    // Process resume data for AI analysis
    let resumeFormatted: string | undefined;
    const existingResumeData = (candidate as Candidate & { resume_extracted_data?: ResumeData | null }).resume_extracted_data;

    if (existingResumeData?.fullText && existingResumeData.extracted.skills.length > 0) {
      // Already extracted — use it directly
      resumeFormatted = formatResumeForAnalysis(existingResumeData);
    } else if ((candidate as Candidate & { resume_url?: string }).resume_url) {
      // Need to parse and extract from PDF
      try {
        console.log('Background AI: Parsing resume PDF for candidate', candidateId);

        let resumeData: ResumeData;

        if (existingResumeData?.fullText) {
          // We have raw text from apply step — run AI extraction
          resumeData = await extractResumeData(
            existingResumeData.fullText,
            existingResumeData.metadata.pages,
            existingResumeData.metadata.size || 0
          );
        } else {
          // Parse PDF from URL
          const { text, pages, size } = await parsePDFFromURL(
            (candidate as Candidate & { resume_url: string }).resume_url
          );
          resumeData = await extractResumeData(text, pages, size);
        }

        resumeFormatted = formatResumeForAnalysis(resumeData);

        // Save extracted data for future use
        await supabase
          .from('candidates')
          .update({ resume_extracted_data: resumeData } as never)
          .eq('id', candidateId);

        console.log('Background AI: Resume extracted successfully', {
          skills: resumeData.extracted.skills.length,
          experience: resumeData.extracted.experience.length,
        });
      } catch (resumeError) {
        console.error('Background AI: Failed to process resume, continuing without it', resumeError);
      }
    }

    // Run AI analysis
    let analysis;
    if (USE_MOCK_AI) {
      console.log('Background AI: Using mock analysis for candidate', candidateId);
      analysis = MOCK_ANALYSIS_RESULT;
    } else {
      console.log('Background AI: Running Claude analysis for candidate', candidateId);
      const prompt = GENERAL_CANDIDATE_ANALYSIS_PROMPT(candidateForAnalysis as Candidate, resumeFormatted);
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
        ai_strengths: analysis.strengths || [],
        ai_concerns: analysis.concerns || [],
        ai_recommendation: analysis.recommendation || null,
        ai_reasoning: analysis.reasoning || null,
      } as never)
      .eq('id', candidateId);

    console.log('Background AI: Analysis complete for candidate', candidateId, 'Score:', analysis.score);

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
    }

    console.log('Background AI: All processing complete for candidate', candidateId);

    return NextResponse.json({
      success: true,
      score: analysis.score,
      category: analysis.category,
    });
  } catch (error) {
    console.error('Background AI: Error processing candidate', candidateId, error);
    return NextResponse.json(
      { error: 'Failed to analyze candidate' },
      { status: 500 }
    );
  }
}
