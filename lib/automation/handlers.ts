/**
 * Automation Handlers
 *
 * Handler functions for each automation action type.
 * Called by the process-automation cron job.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Candidate, Request } from '@/lib/supabase/types';
import { generatePersonalizedOutreach } from '@/lib/outreach/message-generator';
import type { AutomationJob } from './queue';
import type { QuestionnaireQuestionSnapshot, SoftSkillCompetency, QuestionnaireQuestion } from '@/lib/supabase/types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ─── Telegram helpers ───────────────────────────────────────

interface TelegramSendResult {
  ok: boolean;
  result?: { message_id: number };
}

async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: Record<string, unknown>
): Promise<TelegramSendResult> {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        ...options,
      }),
    }
  );
  return response.json();
}

async function editMessageReplyMarkup(chatId: number, messageId: number) {
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] },
      }),
    }
  );
}

// ─── Helper: fetch candidate + request ──────────────────────

async function fetchCandidateAndRequest(
  supabase: SupabaseClient,
  candidateId: string,
  requestId: string
): Promise<{ candidate: Candidate; request: Request } | null> {
  const { data: candidateData } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .single();

  const { data: requestData } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!candidateData || !requestData) return null;

  return {
    candidate: candidateData as Candidate,
    request: requestData as Request,
  };
}

// ─── Handler: send_outreach ─────────────────────────────────

export async function handleSendOutreach(supabase: SupabaseClient, job: AutomationJob) {
  const data = await fetchCandidateAndRequest(supabase, job.candidate_id, job.request_id);
  if (!data) throw new Error('Candidate or request not found');

  const { candidate, request } = data;

  // Must have telegram_chat_id for automated outreach with inline buttons
  if (!candidate.telegram_chat_id) {
    console.log(`Automation: Candidate ${candidate.id} has no telegram_chat_id, skipping automated outreach`);
    throw new Error('No telegram_chat_id — manual outreach required');
  }

  // Must have approved template
  if (!request.outreach_template || !request.outreach_template_approved) {
    throw new Error('Outreach template not approved for this request');
  }

  // Generate personalized message
  const personalizedText = await generatePersonalizedOutreach(
    request.outreach_template,
    candidate,
    request
  );

  // Send via Telegram with inline buttons
  const result = await sendTelegramMessage(candidate.telegram_chat_id, personalizedText, {
    reply_markup: {
      inline_keyboard: [[
        {
          text: '\u2705 Так, цікаво дізнатись більше',
          callback_data: `outreach_yes:${candidate.id}:${request.id}`,
        },
        {
          text: '\u274c Дякую, не зараз',
          callback_data: `outreach_no:${candidate.id}:${request.id}`,
        },
      ]],
    },
  });

  if (!result.ok) {
    throw new Error('Failed to send Telegram message');
  }

  // Save message_id for reference
  if (result.result?.message_id) {
    await supabase
      .from('candidate_request_matches')
      .update({ outreach_telegram_message_id: result.result.message_id } as never)
      .eq('candidate_id', candidate.id)
      .eq('request_id', request.id);
  }

  // Update candidate status
  await supabase
    .from('candidates')
    .update({
      pipeline_stage: 'outreach_sent',
      outreach_status: 'sent',
      outreach_sent_at: new Date().toISOString(),
    } as never)
    .eq('id', candidate.id);

  // Log to conversations
  await supabase.from('candidate_conversations').insert({
    candidate_id: candidate.id,
    direction: 'outbound',
    message_type: 'outreach',
    content: personalizedText,
    metadata: {
      automated: true,
      request_id: request.id,
      telegram_message_id: result.result?.message_id,
    },
  } as never);

  console.log(`Automation: Outreach sent to candidate ${candidate.id} for request ${request.id}`);
}

// ─── Handler: send_questionnaire ────────────────────────────

export async function handleSendQuestionnaire(supabase: SupabaseClient, job: AutomationJob) {
  const data = await fetchCandidateAndRequest(supabase, job.candidate_id, job.request_id);
  if (!data) throw new Error('Candidate or request not found');

  const { candidate, request } = data;

  // Build questions from request config (same logic as POST /api/questionnaire/send)
  const competencyIds = request.questionnaire_competency_ids || [];
  const questionIds = request.questionnaire_question_ids || [];

  if (competencyIds.length === 0 && questionIds.length === 0) {
    throw new Error('No questionnaire competencies/questions configured for this request');
  }

  let questions: QuestionnaireQuestionSnapshot[] = [];

  // Random competencies
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

    for (const compId of competencyIds) {
      const compQuestions = dbQuestions.filter(q => q.competency_id === compId);
      const count = Math.min(compQuestions.length, Math.floor(Math.random() * 2) + 3);
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

  // Specific question IDs
  if (questionIds.length > 0) {
    const { data: specificQData } = await supabase
      .from('questionnaire_questions' as never)
      .select('*')
      .in('id', questionIds)
      .eq('is_active', true);

    const specificQuestions = (specificQData || []) as unknown as QuestionnaireQuestion[];
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

  // Deduplicate
  const seen = new Set<string>();
  questions = questions.filter(q => {
    if (seen.has(q.question_id)) return false;
    seen.add(q.question_id);
    return true;
  });

  if (questions.length === 0) {
    throw new Error('No active questions found for configured competencies');
  }

  // Create questionnaire response record
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days

  const { error: insertError } = await supabase
    .from('questionnaire_responses' as never)
    .insert({
      candidate_id: candidate.id,
      request_id: request.id,
      token,
      status: 'sent',
      questions: questions as never,
      sent_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    } as never);

  if (insertError) {
    throw new Error(`Failed to create questionnaire: ${insertError.message}`);
  }

  const questionnaireUrl = `${APP_URL}/questionnaire/${token}`;

  // Update candidate
  await supabase
    .from('candidates')
    .update({
      pipeline_stage: 'questionnaire_sent',
      questionnaire_status: 'sent',
    } as never)
    .eq('id', candidate.id);

  // Send link via Telegram if possible
  if (candidate.telegram_chat_id) {
    await sendTelegramMessage(
      candidate.telegram_chat_id,
      `Ось ваша анкета: ${questionnaireUrl}\n\nДедлайн — 5 днів. Якщо є питання, пишіть сюди.`
    );
  }

  // Log to conversations
  await supabase.from('candidate_conversations').insert({
    candidate_id: candidate.id,
    direction: 'outbound',
    message_type: 'questionnaire_sent',
    content: `Надіслано анкету soft skills (${questions.length} питань)`,
    metadata: { request_id: request.id, token, questions_count: questions.length, automated: true },
  } as never);

  console.log(`Automation: Questionnaire sent to candidate ${candidate.id}`);
}

// ─── Handler: send_test_task ────────────────────────────────

export async function handleSendTestTask(supabase: SupabaseClient, job: AutomationJob) {
  const data = await fetchCandidateAndRequest(supabase, job.candidate_id, job.request_id);
  if (!data) throw new Error('Candidate or request not found');

  const { candidate, request } = data;

  if (!request.test_task_url) {
    throw new Error('No test task URL configured for this request');
  }

  // Prevent duplicate
  const status = candidate.test_task_status;
  if (status && status !== 'not_sent') {
    console.log(`Automation: Test task already ${status} for candidate ${candidate.id}`);
    return;
  }

  // Import and generate test task message
  const { generateTestTaskMessage } = await import('@/lib/outreach/message-generator');
  const testTaskMessage = await generateTestTaskMessage(candidate, request, request.test_task_url);

  // Calculate deadline
  const now = new Date();
  const deadlineDays = request.test_task_deadline_days || 3;
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + deadlineDays);
  deadline.setHours(18, 0, 0, 0);

  // Send via Telegram
  if (candidate.telegram_chat_id) {
    await sendTelegramMessage(candidate.telegram_chat_id, testTaskMessage);
  }

  // Update candidate
  await supabase
    .from('candidates')
    .update({
      pipeline_stage: 'test_sent',
      test_task_status: 'sent',
      test_task_sent_at: now.toISOString(),
      test_task_original_deadline: deadline.toISOString(),
      test_task_current_deadline: deadline.toISOString(),
    } as never)
    .eq('id', candidate.id);

  // Log
  await supabase.from('candidate_conversations').insert({
    candidate_id: candidate.id,
    direction: 'outbound',
    message_type: 'test_task',
    content: testTaskMessage,
    metadata: {
      deadline: deadline.toISOString(),
      deadline_days: deadlineDays,
      automated: true,
    },
  } as never);

  console.log(`Automation: Test task sent to candidate ${candidate.id}`);
}

// ─── Handler: send_invite ───────────────────────────────────

export async function handleSendInvite(supabase: SupabaseClient, job: AutomationJob) {
  const data = await fetchCandidateAndRequest(supabase, job.candidate_id, job.request_id);
  if (!data) throw new Error('Candidate or request not found');

  const { candidate } = data;

  const message = `Вітаємо! Ми уважно розглянули вашу кандидатуру і раді запросити вас на інтерв'ю з нашою командою. Найближчим часом з вами зв'яжеться менеджер для узгодження часу. До зустрічі!`;

  if (candidate.telegram_chat_id) {
    await sendTelegramMessage(candidate.telegram_chat_id, message);
  }

  await supabase
    .from('candidates')
    .update({ pipeline_stage: 'interview' } as never)
    .eq('id', candidate.id);

  await supabase.from('candidate_conversations').insert({
    candidate_id: candidate.id,
    direction: 'outbound',
    message_type: 'test_task_decision',
    content: message,
    metadata: { decision: 'invite', automated: true },
  } as never);

  console.log(`Automation: Interview invite sent to candidate ${candidate.id}`);
}

// ─── Handler: send_rejection ────────────────────────────────

export async function handleSendRejection(supabase: SupabaseClient, job: AutomationJob) {
  const data = await fetchCandidateAndRequest(supabase, job.candidate_id, job.request_id);
  if (!data) throw new Error('Candidate or request not found');

  const { candidate } = data;

  const message = `Дякуємо за час і зусилля, які ви вклали в наш процес відбору. На жаль, цього разу ми рухаємось з іншими кандидатами. Бажаємо успіхів у пошуку!`;

  if (candidate.telegram_chat_id) {
    await sendTelegramMessage(candidate.telegram_chat_id, message);
  }

  await supabase
    .from('candidates')
    .update({ pipeline_stage: 'rejected' } as never)
    .eq('id', candidate.id);

  await supabase.from('candidate_conversations').insert({
    candidate_id: candidate.id,
    direction: 'outbound',
    message_type: 'test_task_decision',
    content: message,
    metadata: { decision: 'reject', automated: true },
  } as never);

  console.log(`Automation: Rejection sent to candidate ${candidate.id}`);
}

// ─── Main dispatcher ────────────────────────────────────────

export async function executeAutomationJob(supabase: SupabaseClient, job: AutomationJob) {
  switch (job.action_type) {
    case 'send_outreach':
      return handleSendOutreach(supabase, job);
    case 'send_questionnaire':
      return handleSendQuestionnaire(supabase, job);
    case 'send_test_task':
      return handleSendTestTask(supabase, job);
    case 'send_invite':
      return handleSendInvite(supabase, job);
    case 'send_rejection':
      return handleSendRejection(supabase, job);
    default:
      throw new Error(`Unknown action type: ${job.action_type}`);
  }
}

// Re-export for use in webhook handler
export { editMessageReplyMarkup, sendTelegramMessage as sendTelegramMessageFromHandler };
