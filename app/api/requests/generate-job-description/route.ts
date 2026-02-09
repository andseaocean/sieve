import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { analyzeWithClaude } from '@/lib/ai/claude';
import { GENERATE_JOB_DESCRIPTION_PROMPT } from '@/lib/ai/prompts';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.required_skills) {
      return NextResponse.json(
        { error: 'Title and required_skills are required' },
        { status: 400 }
      );
    }

    const prompt = GENERATE_JOB_DESCRIPTION_PROMPT({
      title: body.title,
      required_skills: body.required_skills,
      nice_to_have_skills: body.nice_to_have_skills,
      soft_skills: body.soft_skills,
      description: body.description,
      location: body.location,
      employment_type: body.employment_type,
      remote_policy: body.remote_policy,
      ai_orientation: body.ai_orientation,
      red_flags: body.red_flags,
    });

    const jobDescription = await analyzeWithClaude(prompt);

    return NextResponse.json({
      success: true,
      jobDescription: jobDescription.trim(),
    });
  } catch (error) {
    console.error('Error generating job description:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate job description' },
      { status: 500 }
    );
  }
}
