import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServerClient } from '@/lib/supabase/client';
import { BookmarkletProfile, RequestMatch } from '@/lib/sourcing/evaluator';
import { AIAnalysisResult } from '@/lib/ai/claude';

interface SaveColdCandidateRequest {
  profile: BookmarkletProfile;
  evaluation: AIAnalysisResult;
  matches: RequestMatch[];
  outreach_message: string;
  manager_notes?: string;
  status?: string;
}

function getFirstName(name: string): string {
  const parts = name.trim().split(' ');
  return parts[0] || name;
}

function getLastName(name: string): string {
  const parts = name.trim().split(' ');
  return parts.slice(1).join(' ') || '';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SaveColdCandidateRequest = await request.json();
    const { profile, evaluation, matches, outreach_message, manager_notes } = body;

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile data is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if candidate with same email or profile URL already exists
    if (profile.email) {
      const { data: existingByEmail } = await supabase
        .from('candidates')
        .select('id')
        .eq('email', profile.email)
        .single();

      if (existingByEmail) {
        return NextResponse.json(
          { error: 'Кандидат з таким email вже існує в базі' },
          { status: 400 }
        );
      }
    }

    if (profile.url) {
      const { data: existingByUrl } = await supabase
        .from('candidates')
        .select('id')
        .eq('profile_url', profile.url)
        .single();

      if (existingByUrl) {
        return NextResponse.json(
          { error: 'Кандидат з цим профілем вже існує в базі' },
          { status: 400 }
        );
      }
    }

    // Generate a unique placeholder email if not available
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    const namePart = (profile.username || profile.name || 'unknown').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const email = profile.email || `${namePart}.${uniqueId}@${profile.platform}.placeholder`;

    // Build candidate data object - only include fields that exist in the schema
    const candidateInsertData: Record<string, unknown> = {
      first_name: getFirstName(profile.name),
      last_name: getLastName(profile.name),
      email,
      phone: profile.phone || null,
      linkedin_url: profile.platform === 'linkedin' ? profile.url : null,
      portfolio_url: profile.platform === 'github' ? profile.url : profile.website || null,
      about_text: profile.about || profile.bio || null,
      key_skills: profile.skills || [],
      source: 'cold',
      sourcing_method: 'quick_check',
      profile_url: profile.url,
      platform: profile.platform,
      current_position: profile.position || profile.headline || null,
      location: profile.location || null,
      experience_years: profile.experience_years || null,
      outreach_message: outreach_message || null,
    };

    // Try to add AI fields (they may not exist yet in DB)
    if (evaluation) {
      candidateInsertData.ai_score = evaluation.score || null;
      candidateInsertData.ai_category = evaluation.category || null;
      candidateInsertData.ai_summary = evaluation.summary || null;
      candidateInsertData.ai_strengths = evaluation.strengths || [];
      candidateInsertData.ai_concerns = evaluation.concerns || [];
      candidateInsertData.ai_recommendation = evaluation.recommendation || null;
      candidateInsertData.ai_reasoning = evaluation.reasoning || null;
    }

    // Insert candidate
    const { data: candidateData, error: insertError } = await supabase
      .from('candidates')
      .insert(candidateInsertData as never)
      .select()
      .single();

    // If insert failed, try without AI fields (they may not exist in DB yet)
    let candidate: { id: string };
    if (insertError) {
      console.error('Error inserting candidate with AI fields:', insertError);

      // Remove AI fields and try again
      delete candidateInsertData.ai_score;
      delete candidateInsertData.ai_category;
      delete candidateInsertData.ai_summary;
      delete candidateInsertData.ai_strengths;
      delete candidateInsertData.ai_concerns;
      delete candidateInsertData.ai_recommendation;
      delete candidateInsertData.ai_reasoning;

      const { data: retryData, error: retryError } = await supabase
        .from('candidates')
        .insert(candidateInsertData as never)
        .select()
        .single();

      if (retryError) {
        console.error('Error inserting candidate (retry):', retryError);
        return NextResponse.json(
          { error: `Failed to save candidate: ${retryError.message}` },
          { status: 500 }
        );
      }

      candidate = retryData as { id: string };
    } else {
      candidate = candidateData as { id: string };
    }

    // Insert matches
    if (matches && matches.length > 0) {
      const matchInserts = matches.map((match) => ({
        candidate_id: candidate.id,
        request_id: match.request_id,
        match_score: match.match_score,
        match_explanation: match.explanation,
        status: 'new',
        manager_notes: manager_notes || null,
      }));

      const { error: matchError } = await supabase
        .from('candidate_request_matches')
        .insert(matchInserts as never);

      if (matchError) {
        console.error('Error inserting matches:', matchError);
        // Don't fail the whole operation if matches fail
      }
    }

    // Add a comment if manager_notes provided
    if (manager_notes) {
      await supabase
        .from('comments')
        .insert({
          candidate_id: candidate.id,
          manager_id: session.user.id,
          text: `[Quick Check Notes] ${manager_notes}`,
        } as never);
    }

    return NextResponse.json({
      success: true,
      candidate_id: candidate.id,
      message: 'Candidate saved successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/sourcing/save-cold-candidate:', error);
    return NextResponse.json(
      { error: 'Failed to save candidate' },
      { status: 500 }
    );
  }
}
