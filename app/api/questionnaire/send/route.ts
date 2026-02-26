import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createServiceRoleClient } from '@/lib/supabase/client';
import type { QuestionnaireQuestionSnapshot, SoftSkillCompetency, QuestionnaireQuestion } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidate_id, request_id } = await request.json();

    if (!candidate_id || !request_id) {
      return NextResponse.json({ error: 'candidate_id and request_id are required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Get candidate
    const { data: candidateData, error: candError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate_id)
      .single();

    if (candError || !candidateData) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const candidate = candidateData as unknown as { questionnaire_status: string | null };

    // Check if questionnaire already sent and active
    if (candidate.questionnaire_status === 'sent' || candidate.questionnaire_status === 'in_progress') {
      return NextResponse.json({ error: 'Анкета вже надіслана' }, { status: 400 });
    }

    // Get request with questionnaire config
    const { data: req, error: reqError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (reqError || !req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const competencyIds = (req as Record<string, unknown>).questionnaire_competency_ids as string[] || [];
    const questionIds = (req as Record<string, unknown>).questionnaire_question_ids as string[] || [];
    // Legacy: custom questions for old requests
    const customQuestions = (req as Record<string, unknown>).questionnaire_custom_questions as Array<{ text: string }> || [];

    if (competencyIds.length === 0 && questionIds.length === 0 && customQuestions.length === 0) {
      return NextResponse.json({ error: 'Для цієї вакансії не обрані компетенції або питання' }, { status: 400 });
    }

    let questions: QuestionnaireQuestionSnapshot[] = [];

    // 1. For "random" competencies: fetch active questions and pick 3-4 random
    if (competencyIds.length > 0) {
      const { data: competenciesData } = await supabase
        .from('soft_skill_competencies' as never)
        .select('id, name')
        .in('id', competencyIds);

      const competencies = (competenciesData || []) as unknown as Pick<SoftSkillCompetency, 'id' | 'name'>[];
      const compMap = new Map(competencies.map(c => [c.id, c.name]));

      const { data: dbQuestionsData } = await supabase
        .from('questionnaire_questions' as never)
        .select('*')
        .in('competency_id', competencyIds)
        .eq('is_active', true);

      const dbQuestions = (dbQuestionsData || []) as unknown as QuestionnaireQuestion[];

      // Group by competency and pick 3-4 random from each
      for (const compId of competencyIds) {
        const compQuestions = dbQuestions.filter(q => q.competency_id === compId);
        const count = Math.min(compQuestions.length, Math.floor(Math.random() * 2) + 3); // 3 or 4
        const shuffled = [...compQuestions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);

        selected.forEach(q => {
          questions.push({
            question_id: q.id,
            competency_id: q.competency_id,
            competency_name: compMap.get(q.competency_id) || '',
            text: q.text,
          });
        });
      }
    }

    // 2. For specific question IDs: fetch those exact questions
    if (questionIds.length > 0) {
      const { data: specificQData } = await supabase
        .from('questionnaire_questions' as never)
        .select('*')
        .in('id', questionIds)
        .eq('is_active', true);

      const specificQuestions = (specificQData || []) as unknown as QuestionnaireQuestion[];

      // Fetch competency names for these questions
      const neededCompIds = [...new Set(specificQuestions.map(q => q.competency_id))];
      if (neededCompIds.length > 0) {
        const { data: compNamesData } = await supabase
          .from('soft_skill_competencies' as never)
          .select('id, name')
          .in('id', neededCompIds);

        const compNameMap = new Map(
          ((compNamesData || []) as unknown as Pick<SoftSkillCompetency, 'id' | 'name'>[]).map(c => [c.id, c.name])
        );

        specificQuestions.forEach(q => {
          questions.push({
            question_id: q.id,
            competency_id: q.competency_id,
            competency_name: compNameMap.get(q.competency_id) || '',
            text: q.text,
          });
        });
      }
    }

    // 3. Legacy: add custom questions (for old requests)
    customQuestions.forEach((cq, i) => {
      if (cq.text?.trim()) {
        questions.push({
          question_id: `custom_${i}`,
          competency_id: 'custom',
          competency_name: 'Специфічне питання',
          text: cq.text,
        });
      }
    });

    // Deduplicate by question_id
    const seen = new Set<string>();
    questions = questions.filter(q => {
      if (seen.has(q.question_id)) return false;
      seen.add(q.question_id);
      return true;
    });

    if (questions.length === 0) {
      return NextResponse.json({ error: 'Немає активних питань для обраних компетенцій' }, { status: 400 });
    }

    // Generate unique token
    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // +5 days

    // Create questionnaire response
    const { error: insertError } = await supabase
      .from('questionnaire_responses' as never)
      .insert({
        candidate_id,
        request_id,
        token,
        status: 'sent',
        questions: questions as never,
        sent_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      } as never);

    if (insertError) {
      console.error('Error creating questionnaire response:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update candidate status
    await supabase
      .from('candidates')
      .update({ questionnaire_status: 'sent' } as never)
      .eq('id', candidate_id);

    // Log to conversations
    await supabase.from('candidate_conversations').insert({
      candidate_id,
      direction: 'outbound',
      message_type: 'questionnaire_sent',
      content: `Надіслано анкету soft skills (${questions.length} питань)`,
      metadata: { request_id, token, questions_count: questions.length },
    } as never);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const questionnaireUrl = `${appUrl}/questionnaire/${token}`;

    return NextResponse.json({
      success: true,
      token,
      questionnaire_url: questionnaireUrl,
      questions_count: questions.length,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error in POST /api/questionnaire/send:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
