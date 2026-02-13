import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { analyzeWithClaude, analyzeWithClaudeAndPDF, parseAIAnalysisResult, MOCK_ANALYSIS_RESULT } from '@/lib/ai/claude';
import { GENERAL_CANDIDATE_ANALYSIS_PROMPT } from '@/lib/ai/prompts';
import { Candidate } from '@/lib/supabase/types';
import { downloadResumePDFAsBase64 } from '@/lib/pdf/downloader';

const USE_MOCK_AI = process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { candidate_id } = body;

    if (!candidate_id) {
      return NextResponse.json({ error: 'candidate_id is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch candidate
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate_id)
      .single();

    if (candidateError || !candidateData) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const candidate = candidateData as Candidate;

    // Download PDF resume if available
    let pdfBase64: string | null = null;
    const candidateResumeUrl = (candidate as Candidate & { resume_url?: string }).resume_url;

    if (candidateResumeUrl) {
      try {
        pdfBase64 = await downloadResumePDFAsBase64(supabase, candidateResumeUrl);
        console.log('Resume PDF downloaded for analysis, size:', Math.round(pdfBase64.length / 1024), 'KB');
      } catch (pdfError) {
        console.error('Failed to download resume PDF, continuing without it:', pdfError);
      }
    }

    let analysis;

    if (USE_MOCK_AI) {
      console.log('Using mock AI analysis');
      analysis = MOCK_ANALYSIS_RESULT;
    } else {
      const hasPDF = !!pdfBase64;
      const prompt = GENERAL_CANDIDATE_ANALYSIS_PROMPT(candidate, undefined, hasPDF);
      const response = pdfBase64
        ? await analyzeWithClaudeAndPDF(prompt, pdfBase64)
        : await analyzeWithClaude(prompt);
      analysis = parseAIAnalysisResult(response);
    }

    // Update candidate with full AI results
    const updateData: Record<string, unknown> = {
      ai_score: analysis.score,
      ai_category: analysis.category,
      ai_summary: analysis.summary,
      ai_strengths: analysis.strengths || [],
      ai_concerns: analysis.concerns || [],
      ai_recommendation: analysis.recommendation || null,
      ai_reasoning: analysis.reasoning || null,
    };

    const { error: updateError } = await supabase
      .from('candidates')
      .update(updateData as never)
      .eq('id', candidate_id);

    if (updateError) {
      console.error('Error updating candidate with full AI fields:', updateError);

      // Fallback: try without new fields (in case DB doesn't have them yet)
      const { error: fallbackError } = await supabase
        .from('candidates')
        .update({
          ai_score: analysis.score,
          ai_category: analysis.category,
          ai_summary: analysis.summary,
        } as never)
        .eq('id', candidate_id);

      if (fallbackError) {
        console.error('Error updating candidate (fallback):', fallbackError);
        return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Error in POST /api/ai/analyze:', error);
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
  }
}
