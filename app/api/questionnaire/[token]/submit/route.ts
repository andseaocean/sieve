import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { evaluateQuestionnaire } from '@/lib/ai/evaluateQuestionnaire';
import type { QuestionnaireQuestionSnapshot, QuestionnaireResponse } from '@/lib/supabase/types';

// POST submit questionnaire answers (public)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { answers } = await request.json();

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Answers are required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: responseData, error } = await supabase
      .from('questionnaire_responses' as never)
      .select('*')
      .eq('token', token)
      .single();

    if (error || !responseData) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const response = responseData as unknown as QuestionnaireResponse;

    // Check if already completed
    if (response.status === 'completed') {
      return NextResponse.json({ error: 'already_submitted' }, { status: 400 });
    }

    // Check expiry
    if (response.expires_at && new Date(response.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 400 });
    }

    const questions = response.questions as unknown as QuestionnaireQuestionSnapshot[];

    // Validate all questions answered
    const unanswered = questions.filter(q => !answers[q.question_id]?.trim());
    if (unanswered.length > 0) {
      return NextResponse.json({
        error: `Не всі питання заповнені (${unanswered.length} залишилось)`,
      }, { status: 400 });
    }

    // Save answers and update status
    const now = new Date().toISOString();
    await supabase
      .from('questionnaire_responses' as never)
      .update({
        answers: answers as never,
        status: 'completed',
        submitted_at: now,
      } as never)
      .eq('id', response.id);

    // Update candidate status
    await supabase
      .from('candidates')
      .update({ questionnaire_status: 'completed' } as never)
      .eq('id', response.candidate_id);

    // Log to conversations
    await supabase.from('candidate_conversations').insert({
      candidate_id: response.candidate_id,
      direction: 'inbound',
      message_type: 'questionnaire_submitted',
      content: `Кандидат заповнив анкету soft skills (${questions.length} питань)`,
      metadata: { token, questions_count: questions.length },
    } as never);

    // Start AI evaluation (async, don't wait)
    evaluateQuestionnaireAsync(response.id, response.candidate_id, response.request_id, questions, answers)
      .catch(err => console.error('Async questionnaire evaluation error:', err));

    return NextResponse.json({
      success: true,
      message: 'Дякуємо за заповнення анкети!',
    });
  } catch (error) {
    console.error('Error in POST /api/questionnaire/[token]/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function evaluateQuestionnaireAsync(
  responseId: string,
  candidateId: string,
  requestId: string,
  questions: QuestionnaireQuestionSnapshot[],
  answers: Record<string, string>
) {
  try {
    const supabase = createServiceRoleClient();

    // Get request info for context
    const { data: reqData } = await supabase
      .from('requests')
      .select('title, description')
      .eq('id', requestId)
      .single();

    const req = reqData as unknown as { title: string; description: string } | null;

    const result = await evaluateQuestionnaire({
      questions,
      answers,
      requestTitle: req?.title || '',
      requestDescription: req?.description || '',
    });

    // Save AI evaluation
    await supabase
      .from('questionnaire_responses' as never)
      .update({
        ai_score: result.score,
        ai_evaluation: result.evaluation as never,
      } as never)
      .eq('id', responseId);

    console.log(`Questionnaire evaluated for candidate ${candidateId}: ${result.score}/10`);
  } catch (error) {
    console.error('Error in async questionnaire evaluation:', error);

    const supabase = createServiceRoleClient();
    await supabase
      .from('questionnaire_responses' as never)
      .update({
        ai_evaluation: { error: 'Помилка автоматичної оцінки. Потрібна ручна перевірка.' } as never,
      } as never)
      .eq('id', responseId);
  }
}
