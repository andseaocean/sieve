import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { evaluateColdCandidate, BookmarkletProfile } from '@/lib/sourcing/evaluator';
import { generateOutreachMessage } from '@/lib/sourcing/message-generator';

export async function POST(request: NextRequest) {
  console.log('[API /api/sourcing/evaluate] POST request received');
  try {
    const session = await getServerSession(authOptions);
    console.log('[API] Session:', session ? 'exists' : 'null');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { profile } = body as { profile: BookmarkletProfile };
    console.log('[API] Profile received:', profile?.name, profile?.platform);

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile data is required' },
        { status: 400 }
      );
    }

    if (!profile.name || !profile.platform) {
      return NextResponse.json(
        { error: 'Invalid profile data: name and platform are required' },
        { status: 400 }
      );
    }

    console.log(`[API] Evaluating candidate: ${profile.name} from ${profile.platform}`);

    // Run AI evaluation
    const evaluationResult = await evaluateColdCandidate(profile);

    // Generate outreach message
    const outreachMessage = await generateOutreachMessage({
      profile,
      evaluation: evaluationResult.evaluation,
      bestMatch: evaluationResult.best_match
        ? {
            request_title: evaluationResult.best_match.request_title,
            match_score: evaluationResult.best_match.match_score,
          }
        : undefined,
      tone: 'friendly',
    });

    return NextResponse.json({
      success: true,
      evaluation: evaluationResult.evaluation,
      matches: evaluationResult.matches,
      best_match: evaluationResult.best_match,
      outreach_message: outreachMessage,
    });
  } catch (error) {
    console.error('Error in POST /api/sourcing/evaluate:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate profile' },
      { status: 500 }
    );
  }
}
