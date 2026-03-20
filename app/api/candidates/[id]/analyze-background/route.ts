/**
 * API Endpoint: Background AI Analysis
 *
 * Runs AI analysis for a candidate in the background.
 * Called internally after candidate creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { analyzeWithClaude, analyzeWithClaudeAndPDF, parseAIAnalysisResult, parseAIMatchResult, MOCK_ANALYSIS_RESULT, MOCK_MATCH_RESULT } from '@/lib/ai/claude';
import { GENERAL_CANDIDATE_ANALYSIS_PROMPT, MATCH_CANDIDATE_TO_REQUEST_PROMPT } from '@/lib/ai/prompts';
import { translateCandidateContent } from '@/lib/translation';
import { Candidate, Request } from '@/lib/supabase/types';
import { downloadResumePDFAsBase64 } from '@/lib/pdf/downloader';

const USE_MOCK_AI = process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY;

// Helper: run matching for a single request, upsert to candidate_request_matches
async function matchCandidateToRequest(
  supabase: ReturnType<typeof createServiceRoleClient>,
  candidateId: string,
  candidateForAnalysis: Candidate,
  analysis: { score: number; category: string; summary: string; strengths: string[] },
  requestData: Request,
): Promise<number> {
  let matchResult;
  if (USE_MOCK_AI) {
    matchResult = MOCK_MATCH_RESULT;
  } else {
    const matchPrompt = MATCH_CANDIDATE_TO_REQUEST_PROMPT(candidateForAnalysis, analysis, requestData);
    const matchResponse = await analyzeWithClaude(matchPrompt);
    matchResult = parseAIMatchResult(matchResponse);
  }

  const { data: existingMatchData } = await supabase
    .from('candidate_request_matches')
    .select('id')
    .eq('candidate_id', candidateId)
    .eq('request_id', requestData.id)
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
        request_id: requestData.id,
        match_score: matchResult.match_score,
        match_explanation: `${matchResult.alignment}\n\nMissing: ${matchResult.missing}`,
        status: 'new',
      } as never);
  }

  return matchResult.match_score;
}

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

  // Read body (may contain applied_request_ids)
  let appliedRequestIds: string[] = [];
  try {
    const body = await request.json().catch(() => ({}));
    if (Array.isArray(body?.applied_request_ids)) {
      appliedRequestIds = body.applied_request_ids as string[];
    }
  } catch {
    // no body — ok
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
      applied_request_ids?: string[];
    };

    // Merge applied_request_ids from body and from DB record
    const dbApplied = Array.isArray(candidate.applied_request_ids) ? candidate.applied_request_ids : [];
    if (appliedRequestIds.length === 0 && dbApplied.length > 0) {
      appliedRequestIds = dbApplied;
    }

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

        (candidate as { about_text_translated?: string }).about_text_translated = translated.bio_translated || candidate.about_text || undefined;
        (candidate as { why_vamos_translated?: string }).why_vamos_translated = translated.why_vamos_translated || candidate.why_vamos || undefined;
      } catch (translationError) {
        console.error('Background: Translation failed, continuing with original content', translationError);
      }
    }

    const candidateForAnalysis = {
      ...candidate,
      about_text: candidate.about_text_translated || candidate.about_text,
      why_vamos: candidate.why_vamos_translated || candidate.why_vamos,
    };

    // Download PDF resume as base64 for Claude
    let pdfBase64: string | null = null;
    const candidateResumeUrl = (candidate as Candidate & { resume_url?: string }).resume_url;

    if (candidateResumeUrl) {
      try {
        console.log('Background AI: Downloading resume PDF for candidate', candidateId);
        pdfBase64 = await downloadResumePDFAsBase64(supabase, candidateResumeUrl);
        console.log('Background AI: Resume PDF downloaded, size:', Math.round(pdfBase64.length / 1024), 'KB base64');
      } catch (pdfError) {
        console.error('Background AI: Failed to download resume PDF, continuing without it', pdfError);
      }
    }

    // Run AI analysis
    let analysis;
    if (USE_MOCK_AI) {
      console.log('Background AI: Using mock analysis for candidate', candidateId);
      analysis = MOCK_ANALYSIS_RESULT;
    } else {
      console.log('Background AI: Running Claude analysis for candidate', candidateId);
      const hasPDF = !!pdfBase64;
      const prompt = GENERAL_CANDIDATE_ANALYSIS_PROMPT(candidateForAnalysis as Candidate, undefined, hasPDF);
      const response = pdfBase64
        ? await analyzeWithClaudeAndPDF(prompt, pdfBase64)
        : await analyzeWithClaude(prompt);
      analysis = parseAIAnalysisResult(response);
    }

    // Fetch all active requests
    const { data: allRequestsData } = await supabase
      .from('requests')
      .select('*')
      .eq('status', 'active');

    const allRequests = (allRequestsData ?? []) as Request[];

    const analysisForMatch = {
      score: analysis.score,
      category: analysis.category,
      summary: analysis.summary,
      strengths: analysis.strengths || [],
    };

    // --- Determine which requests to match first (applied) and which later (rest) ---
    const appliedSet = new Set(appliedRequestIds);
    const targetRequests = appliedRequestIds.length > 0
      ? allRequests.filter((r) => appliedSet.has(r.id))
      : allRequests; // "не знаю" — match all

    const restRequests = allRequests.filter((r) => !appliedSet.has(r.id));

    // Step 1: Match against applied (or all if "не знаю") requests
    let primaryRequestId: string | null = null;
    let primaryScore = 0;

    if (targetRequests.length > 0) {
      console.log(`Background AI: Matching candidate to ${targetRequests.length} target requests`);

      const scoreMap: Record<string, number> = {};
      for (const req of targetRequests) {
        try {
          const score = await matchCandidateToRequest(supabase, candidateId, candidateForAnalysis as Candidate, analysisForMatch, req);
          scoreMap[req.id] = score;
          console.log(`Background AI: Match for request ${req.id}: ${score}`);
        } catch (err) {
          console.error(`Background AI: Match failed for request ${req.id}`, err);
        }
      }

      // Choose primary: highest score (tie-break: first in applied_request_ids array)
      const minScoreForPrimary = appliedRequestIds.length > 0 ? 0 : 70; // if "не знаю" require score ≥ 70
      let bestReqId: string | null = null;
      let bestScore = minScoreForPrimary - 1;

      for (const reqId of (appliedRequestIds.length > 0 ? appliedRequestIds : Object.keys(scoreMap))) {
        const s = scoreMap[reqId] ?? 0;
        if (s > bestScore) {
          bestScore = s;
          bestReqId = reqId;
        }
      }

      if (bestReqId) {
        primaryRequestId = bestReqId;
        primaryScore = bestScore;
      }
    }

    // Update candidate with AI results + primary_request_id + pipeline_stage
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
        pipeline_stage: 'analyzed',
        primary_request_id: primaryRequestId,
      } as never)
      .eq('id', candidateId);

    console.log('Background AI: Analysis complete for candidate', candidateId, 'Score:', analysis.score, 'Primary request:', primaryRequestId);

    // Record in candidate_request_history
    if (primaryRequestId) {
      await supabase
        .from('candidate_request_history')
        .insert({
          candidate_id: candidateId,
          from_request_id: null,
          to_request_id: primaryRequestId,
          changed_by: null,
          reason: 'auto_best_match',
          notes: `AI match score: ${primaryScore}`,
        } as never);
    }

    // Step 2: Scan remaining requests asynchronously (fire-and-forget)
    if (restRequests.length > 0) {
      setTimeout(async () => {
        for (const req of restRequests) {
          try {
            await matchCandidateToRequest(supabase, candidateId, candidateForAnalysis as Candidate, analysisForMatch, req);
          } catch (err) {
            console.error(`Background AI (rest scan): Match failed for request ${req.id}`, err);
          }
        }
        console.log(`Background AI: Completed rest-scan for ${restRequests.length} requests for candidate ${candidateId}`);
      }, 0);
    }

    // Trigger outreach automation for strong candidates (score >= 7)
    if (analysis.score >= 7 && primaryRequestId) {
      try {
        const { addToAutomationQueue } = await import('@/lib/automation/queue');

        const { data: reqData } = await supabase
          .from('requests')
          .select('id, outreach_template_approved')
          .eq('id', primaryRequestId)
          .eq('outreach_template_approved', true)
          .single();

        if (reqData) {
          await addToAutomationQueue({
            supabase,
            actionType: 'send_outreach',
            candidateId,
            requestId: primaryRequestId,
          });
          console.log(`Background AI: Queued outreach for candidate ${candidateId}, request ${primaryRequestId}`);
        }
      } catch (outreachError) {
        console.error('Background AI: Failed to queue outreach:', outreachError);
      }
    } else if (analysis.score >= 7 && !primaryRequestId && allRequests.length > 0) {
      // Fallback: find best match from all requests for outreach
      try {
        const { addToAutomationQueue } = await import('@/lib/automation/queue');

        const { data: bestMatchData } = await supabase
          .from('candidate_request_matches')
          .select('request_id, match_score')
          .eq('candidate_id', candidateId)
          .order('match_score', { ascending: false })
          .limit(10);

        if (bestMatchData && bestMatchData.length > 0) {
          for (const match of bestMatchData as { request_id: string; match_score: number }[]) {
            const { data: reqData } = await supabase
              .from('requests')
              .select('id, outreach_template_approved')
              .eq('id', match.request_id)
              .eq('outreach_template_approved', true)
              .single();

            if (reqData) {
              await addToAutomationQueue({
                supabase,
                actionType: 'send_outreach',
                candidateId,
                requestId: match.request_id,
              });
              console.log(`Background AI: Queued outreach (fallback) for candidate ${candidateId}, request ${match.request_id}`);
              break;
            }
          }
        }
      } catch (outreachError) {
        console.error('Background AI: Failed to queue outreach (fallback):', outreachError);
      }
    }

    console.log('Background AI: All processing complete for candidate', candidateId);

    return NextResponse.json({
      success: true,
      score: analysis.score,
      category: analysis.category,
      primary_request_id: primaryRequestId,
    });
  } catch (error) {
    console.error('Background AI: Error processing candidate', candidateId, error);
    return NextResponse.json(
      { error: 'Failed to analyze candidate' },
      { status: 500 }
    );
  }
}
