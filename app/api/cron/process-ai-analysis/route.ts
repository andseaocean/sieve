/**
 * Cron endpoint to process AI analysis queue
 *
 * This endpoint processes pending AI analysis tasks for candidates.
 * Should be called every 5 minutes by external cron service (cron-job.org)
 * since Vercel Hobby only supports daily cron.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { analyzeWithClaude, parseAIAnalysisResult, parseAIMatchResult, MOCK_ANALYSIS_RESULT, MOCK_MATCH_RESULT } from '@/lib/ai/claude';
import { GENERAL_CANDIDATE_ANALYSIS_PROMPT, MATCH_CANDIDATE_TO_REQUEST_PROMPT } from '@/lib/ai/prompts';
import { translateCandidateContent } from '@/lib/translation';
import { Candidate, Request } from '@/lib/supabase/types';
import { extractResumeData, formatResumeForAnalysis } from '@/lib/pdf/extractor';
import { parsePDFFromURL } from '@/lib/pdf/parser';
import type { ResumeData } from '@/lib/pdf/types';

const USE_MOCK_AI = process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY;
const BATCH_SIZE = 5; // Process up to 5 candidates per cron run
const MAX_RETRIES = 3;

interface QueueItem {
  id: string;
  candidate_id: string;
  status: string;
  retry_count: number;
}

/**
 * Process a single candidate's AI analysis
 */
async function processCandidate(candidateId: string): Promise<{ success: boolean; score?: number; error?: string }> {
  const supabase = createServiceRoleClient();

  try {
    // Fetch the candidate
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidateData) {
      return { success: false, error: 'Candidate not found' };
    }

    const candidate = candidateData as Candidate & {
      about_text_translated?: string;
      why_vamos_translated?: string;
      key_skills_translated?: string;
      original_language?: string;
    };

    // Run translation first if needed
    if (candidate.original_language && candidate.original_language !== 'uk' && !candidate.about_text_translated) {
      console.log(`AI Cron: Translating content for candidate ${candidateId}`);

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
        console.error('AI Cron: Translation failed, continuing with original content', translationError);
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
    const candidateResumeUrl = (candidate as Candidate & { resume_url?: string }).resume_url;

    if (existingResumeData?.fullText || candidateResumeUrl) {
      try {
        let resumeData: ResumeData;

        if (existingResumeData?.fullText && existingResumeData.extracted.skills.length > 0) {
          // Already fully extracted
          resumeData = existingResumeData;
          console.log('AI Cron: Using existing resume data for candidate', candidateId);
        } else if (existingResumeData?.fullText) {
          // Have raw text — run AI extraction
          console.log('AI Cron: Extracting structured data from resume text for candidate', candidateId);
          resumeData = await extractResumeData(
            existingResumeData.fullText,
            existingResumeData.metadata.pages,
            existingResumeData.metadata.size || 0
          );

          await supabase
            .from('candidates')
            .update({ resume_extracted_data: resumeData } as never)
            .eq('id', candidateId);
        } else if (candidateResumeUrl) {
          // Parse PDF from URL
          console.log('AI Cron: Parsing resume PDF from URL for candidate', candidateId);
          const { text, pages, size } = await parsePDFFromURL(candidateResumeUrl);
          resumeData = await extractResumeData(text, pages, size);

          await supabase
            .from('candidates')
            .update({ resume_extracted_data: resumeData } as never)
            .eq('id', candidateId);
        } else {
          throw new Error('No resume data available');
        }

        resumeFormatted = formatResumeForAnalysis(resumeData);
        console.log('AI Cron: Resume ready for analysis', {
          skills: resumeData.extracted.skills.length,
          experience: resumeData.extracted.experience.length,
        });
      } catch (resumeError) {
        console.error('AI Cron: Failed to process resume, continuing without it', resumeError);
      }
    }

    // Run AI analysis
    let analysis;
    if (USE_MOCK_AI) {
      console.log('AI Cron: Using mock analysis for candidate', candidateId);
      analysis = MOCK_ANALYSIS_RESULT;
    } else {
      console.log('AI Cron: Running Claude analysis for candidate', candidateId);
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

    console.log('AI Cron: Analysis complete for candidate', candidateId, 'Score:', analysis.score);

    // Match to all active requests
    const { data: requestsData } = await supabase
      .from('requests')
      .select('*')
      .eq('status', 'open');

    if (requestsData && requestsData.length > 0) {
      console.log(`AI Cron: Matching candidate to ${requestsData.length} open requests`);

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

        // Upsert match
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
      }
    }

    return { success: true, score: analysis.score };
  } catch (error) {
    console.error('AI Cron: Error processing candidate', candidateId, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    // Support both header and query param for flexibility with external cron services
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const secretParam = url.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` ||
        secretParam === cronSecret;

      if (!isAuthorized) {
        console.log('AI Cron: Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('AI Cron: Starting AI analysis processing...');

    const supabase = createServiceRoleClient();

    // Get pending items from queue
    const { data: queueItems, error: fetchError } = await supabase
      .from('ai_analysis_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('AI Cron: Error fetching queue items', fetchError);
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
    }

    const items = (queueItems || []) as QueueItem[];

    if (items.length === 0) {
      console.log('AI Cron: No pending items');
      return NextResponse.json({
        processed: 0,
        successful: 0,
        failed: 0,
        message: 'No pending items',
      });
    }

    console.log(`AI Cron: Processing ${items.length} candidates...`);

    let successful = 0;
    let failed = 0;

    for (const item of items) {
      // Mark as processing
      await supabase
        .from('ai_analysis_queue')
        .update({ status: 'processing' } as never)
        .eq('id', item.id);

      const result = await processCandidate(item.candidate_id);

      if (result.success) {
        // Mark as completed
        await supabase
          .from('ai_analysis_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
          } as never)
          .eq('id', item.id);

        successful++;
        console.log(`AI Cron: Candidate ${item.candidate_id} completed with score ${result.score}`);
      } else {
        // Mark as failed or back to pending for retry
        const newRetryCount = item.retry_count + 1;
        const newStatus = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending';

        await supabase
          .from('ai_analysis_queue')
          .update({
            status: newStatus,
            retry_count: newRetryCount,
            error_message: result.error,
          } as never)
          .eq('id', item.id);

        failed++;
        console.error(`AI Cron: Candidate ${item.candidate_id} failed: ${result.error}`);
      }

      // Small delay between processing to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`AI Cron: Completed - ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      processed: items.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error('AI Cron: Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
