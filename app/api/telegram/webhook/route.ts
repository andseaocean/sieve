/**
 * Telegram Webhook Handler
 *
 * Handles all incoming Telegram updates for the Vamos Hiring Bot.
 *
 * Flow:
 * /start               → save chat_id, welcome message + Mini App button
 * start_questionnaire  → start in-bot questionnaire (questions one by one)
 * questionnaire_next   → save answer, next question or finalize
 * text (in questionnaire) → accumulate answer parts
 * other text           → classify + answer questions via AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { classifyResponse } from '@/lib/ai/classifyResponse';
import { answerCandidateQuestion } from '@/lib/telegram/answer-question';
import { sendTelegramMessage, sendTestTaskToCandidate } from '@/lib/telegram/direct-actions';
import { evaluateQuestionnaire } from '@/lib/ai/evaluateQuestionnaire';
import type { Candidate, Request, QuestionnaireQuestionSnapshot, SoftSkillCompetency, QuestionnaireQuestion } from '@/lib/supabase/types';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// ─── Types ───────────────────────────────────────────────────

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: { id: number; username?: string };
    message?: TelegramMessage;
    data?: string;
  };
}

interface BotSession {
  state: 'idle' | 'questionnaire_in_progress';
  questionnaire_response_id?: string;
  current_question_index?: number;
  current_answer_parts?: string[];
}

type CandidateWithSession = Candidate & { bot_session?: BotSession | null };

// ─── Helpers ─────────────────────────────────────────────────

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || '' }),
    }
  );
}

async function editTelegramReplyMarkup(chatId: number, messageId: number) {
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

async function findCandidateByChatId(
  supabase: ReturnType<typeof createServiceRoleClient>,
  chatId: number
): Promise<CandidateWithSession | null> {
  const { data } = await supabase
    .from('candidates')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .single();
  return data as CandidateWithSession | null;
}

async function findCandidateByUsername(
  supabase: ReturnType<typeof createServiceRoleClient>,
  username: string
): Promise<CandidateWithSession | null> {
  const { data } = await supabase
    .from('candidates')
    .select('*')
    .eq('telegram_username', username)
    .single();
  return data as CandidateWithSession | null;
}

/**
 * Build questionnaire questions for a request.
 * Uses configured competencies/questions or falls back to 4-6 random active questions.
 */
async function buildQuestionnaireQuestions(
  supabase: ReturnType<typeof createServiceRoleClient>,
  request: Request
): Promise<QuestionnaireQuestionSnapshot[]> {
  const competencyIds = (request.questionnaire_competency_ids || []) as string[];
  const questionIds = (request.questionnaire_question_ids || []) as string[];

  let questions: QuestionnaireQuestionSnapshot[] = [];

  if (competencyIds.length > 0) {
    const { data: competenciesData } = await supabase
      .from('soft_skill_competencies' as never)
      .select('id, name')
      .in('id', competencyIds);

    const competencies = (competenciesData || []) as unknown as Pick<SoftSkillCompetency, 'id' | 'name'>[];
    const compMap = new Map(competencies.map((c) => [c.id, c.name]));

    const { data: dbQuestionsData } = await supabase
      .from('questionnaire_questions' as never)
      .select('*')
      .in('competency_id', competencyIds)
      .eq('is_active', true);

    const dbQuestions = (dbQuestionsData || []) as unknown as QuestionnaireQuestion[];

    for (const compId of competencyIds) {
      const compQuestions = dbQuestions.filter((q) => q.competency_id === compId);
      const count = Math.min(compQuestions.length, Math.floor(Math.random() * 2) + 3);
      const shuffled = [...compQuestions].sort(() => Math.random() - 0.5);
      shuffled.slice(0, count).forEach((q) => {
        questions.push({
          question_id: q.id,
          competency_id: q.competency_id,
          competency_name: compMap.get(q.competency_id) || '',
          text: q.text,
        });
      });
    }
  }

  if (questionIds.length > 0) {
    const { data: specificQData } = await supabase
      .from('questionnaire_questions' as never)
      .select('*')
      .in('id', questionIds)
      .eq('is_active', true);

    const specificQuestions = (specificQData || []) as unknown as QuestionnaireQuestion[];
    const neededCompIds = [...new Set(specificQuestions.map((q) => q.competency_id))];

    if (neededCompIds.length > 0) {
      const { data: compNamesData } = await supabase
        .from('soft_skill_competencies' as never)
        .select('id, name')
        .in('id', neededCompIds);

      const compNameMap = new Map(
        ((compNamesData || []) as unknown as Pick<SoftSkillCompetency, 'id' | 'name'>[]).map((c) => [c.id, c.name])
      );
      specificQuestions.forEach((q) => {
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
  questions = questions.filter((q) => {
    if (seen.has(q.question_id)) return false;
    seen.add(q.question_id);
    return true;
  });

  // Fallback: pick 4-6 random active questions from DB
  if (questions.length === 0) {
    const { data: fallbackData } = await supabase
      .from('questionnaire_questions' as never)
      .select('*, soft_skill_competencies!inner(name)')
      .eq('is_active', true)
      .limit(20);

    const fallback = (fallbackData || []) as unknown as (QuestionnaireQuestion & {
      soft_skill_competencies: { name: string };
    })[];
    const shuffled = [...fallback].sort(() => Math.random() - 0.5).slice(0, 5);
    shuffled.forEach((q) => {
      questions.push({
        question_id: q.id,
        competency_id: q.competency_id,
        competency_name: q.soft_skill_competencies?.name || '',
        text: q.text,
      });
    });
  }

  return questions;
}

/**
 * Start questionnaire in Telegram chat — sends first question.
 */
async function startQuestionnaire(
  supabase: ReturnType<typeof createServiceRoleClient>,
  chatId: number,
  candidateId: string,
  requestId: string
): Promise<void> {
  const { data: reqData } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single();

  const request = reqData as Request | null;
  if (!request) {
    await sendTelegramMessage(chatId, 'Не вдалося знайти вакансію. Спробуйте пізніше або напишіть нам.');
    return;
  }

  const questions = await buildQuestionnaireQuestions(supabase, request);

  if (questions.length === 0) {
    await sendTelegramMessage(chatId, 'Питання для анкети ще не налаштовані. Ми зв\'яжемося з вами найближчим часом!');
    return;
  }

  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days

  const { data: qrData, error: qrError } = await supabase
    .from('questionnaire_responses' as never)
    .insert({
      candidate_id: candidateId,
      request_id: requestId,
      token,
      status: 'in_progress',
      questions: questions as never,
      sent_at: now.toISOString(),
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    } as never)
    .select()
    .single();

  if (qrError || !qrData) {
    console.error('Failed to create questionnaire response:', qrError);
    await sendTelegramMessage(chatId, 'Виникла помилка при запуску анкети. Спробуйте ще раз.');
    return;
  }

  const qr = qrData as { id: string };

  const botSession: BotSession = {
    state: 'questionnaire_in_progress',
    questionnaire_response_id: qr.id,
    current_question_index: 0,
    current_answer_parts: [],
  };

  await supabase
    .from('candidates')
    .update({
      bot_session: botSession as never,
      pipeline_stage: 'questionnaire_sent',
      questionnaire_status: 'in_progress',
    } as never)
    .eq('id', candidateId);

  await supabase.from('candidate_conversations').insert({
    candidate_id: candidateId,
    direction: 'outbound',
    message_type: 'questionnaire_sent',
    content: `Анкета запущена в боті (${questions.length} питань)`,
    metadata: { request_id: requestId, questions_count: questions.length, automated: true },
  } as never);

  // Send first question
  await sendQuestionMessage(chatId, questions[0], 1, questions.length);

  console.log(`Questionnaire started for candidate ${candidateId}, ${questions.length} questions`);
}

async function sendQuestionMessage(
  chatId: number,
  question: QuestionnaireQuestionSnapshot,
  questionNumber: number,
  totalQuestions: number
): Promise<void> {
  const isLast = questionNumber === totalQuestions;
  const buttonLabel = isLast ? 'Завершити анкету ✓' : 'Перейти до наступного питання →';

  const text = `*Питання ${questionNumber} з ${totalQuestions}*\n_${question.competency_name}_\n\n${question.text}`;

  await sendTelegramMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [[{ text: buttonLabel, callback_data: 'questionnaire_next' }]],
    },
  });
}

/**
 * Handle "next question" button — save current answer, send next question or finalize.
 */
async function handleQuestionnaireNext(
  supabase: ReturnType<typeof createServiceRoleClient>,
  chatId: number,
  callbackQueryId: string
): Promise<void> {
  await answerCallbackQuery(callbackQueryId);

  const candidate = await findCandidateByChatId(supabase, chatId);
  if (!candidate) return;

  const botSession = candidate.bot_session;
  if (botSession?.state !== 'questionnaire_in_progress') return;

  const { questionnaire_response_id, current_question_index = 0, current_answer_parts = [] } = botSession;

  if (!questionnaire_response_id) return;

  // Fetch questionnaire response
  const { data: qrData } = await supabase
    .from('questionnaire_responses' as never)
    .select('*, requests(title, description)')
    .eq('id', questionnaire_response_id)
    .single();

  const qr = qrData as {
    id: string;
    questions: QuestionnaireQuestionSnapshot[];
    answers: Record<string, string> | null;
    requests: { title: string; description: string } | null;
  } | null;

  if (!qr) return;

  const questions = qr.questions as QuestionnaireQuestionSnapshot[];
  const currentQuestion = questions[current_question_index];

  // Save answer for current question
  const currentAnswer = current_answer_parts.join('\n\n');
  const existingAnswers = (qr.answers || {}) as Record<string, string>;
  const updatedAnswers = { ...existingAnswers, [currentQuestion.question_id]: currentAnswer };

  await supabase
    .from('questionnaire_responses' as never)
    .update({ answers: updatedAnswers as never } as never)
    .eq('id', questionnaire_response_id);

  const nextIndex = current_question_index + 1;

  if (nextIndex < questions.length) {
    // Update bot_session with next index
    await supabase
      .from('candidates')
      .update({
        bot_session: {
          ...botSession,
          current_question_index: nextIndex,
          current_answer_parts: [],
        } as never,
      } as never)
      .eq('id', candidate.id);

    await sendQuestionMessage(chatId, questions[nextIndex], nextIndex + 1, questions.length);
  } else {
    // All questions answered — finalize
    await finalizeQuestionnaire(
      supabase,
      chatId,
      candidate.id,
      questionnaire_response_id,
      updatedAnswers,
      questions,
      qr.requests
    );
  }
}

/**
 * Finalize questionnaire: save, evaluate with AI, optionally send test task.
 */
async function finalizeQuestionnaire(
  supabase: ReturnType<typeof createServiceRoleClient>,
  chatId: number,
  candidateId: string,
  questionnaireResponseId: string,
  answers: Record<string, string>,
  questions: QuestionnaireQuestionSnapshot[],
  request: { title: string; description: string } | null
): Promise<void> {
  const now = new Date().toISOString();

  await supabase
    .from('questionnaire_responses' as never)
    .update({
      status: 'completed',
      answers: answers as never,
      submitted_at: now,
    } as never)
    .eq('id', questionnaireResponseId);

  await supabase
    .from('candidates')
    .update({
      questionnaire_status: 'completed',
      pipeline_stage: 'questionnaire_done',
      bot_session: null,
    } as never)
    .eq('id', candidateId);

  await supabase.from('candidate_conversations').insert({
    candidate_id: candidateId,
    direction: 'inbound',
    message_type: 'questionnaire_completed',
    content: 'Анкету завершено через Telegram бот',
    metadata: { questionnaire_response_id: questionnaireResponseId },
  } as never);

  await sendTelegramMessage(
    chatId,
    'Дуже дякую за цю розмову, було цікаво. Ми вже оцінюємо твої відповіді і якщо все добре, то невдовзі я повернуся до тебе із тестовим завданням.'
  );

  // Run AI evaluation
  try {
    const result = await evaluateQuestionnaire({
      questions,
      answers,
      requestTitle: request?.title || '',
      requestDescription: request?.description || '',
    });

    await supabase
      .from('questionnaire_responses' as never)
      .update({
        ai_score: result.score,
        ai_evaluation: result.evaluation as never,
      } as never)
      .eq('id', questionnaireResponseId);

    console.log(`Questionnaire AI evaluation complete for candidate ${candidateId}: score ${result.score}`);

    // If score >= 7, send test task immediately
    if (result.score >= 7) {
      // Get request_id from questionnaire_responses
      const { data: qrFull } = await supabase
        .from('questionnaire_responses' as never)
        .select('request_id')
        .eq('id', questionnaireResponseId)
        .single();

      const requestId = (qrFull as { request_id: string } | null)?.request_id;
      if (requestId) {
        await sendTestTaskToCandidate(supabase, chatId, candidateId, requestId);
      }
    }
  } catch (evalError) {
    console.error('Failed to evaluate questionnaire:', evalError);
  }
}

// ─── Main handlers ────────────────────────────────────────────

async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const text = message.text || '';
  const username = message.from.username;

  const supabase = createServiceRoleClient();

  // /start command
  if (text.startsWith('/start')) {
    // Try to update chat_id for existing candidate
    if (username) {
      await supabase
        .from('candidates')
        .update({ telegram_chat_id: chatId } as never)
        .eq('telegram_username', username)
        .is('telegram_chat_id', null as never);
    }

    await sendTelegramMessage(
      chatId,
      `Привіт, ${message.from.first_name}! Я Vamos Hiring Bot.\n\nМи — AI-first компанія, яка будує майбутнє технологій. Шукаєш роботу в інноваційній команді? Натисни кнопку нижче!`,
      {
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'Подати заявку',
              web_app: { url: `${BASE_URL}/apply` },
            },
          ]],
        },
      }
    );
    return;
  }

  // Find candidate by chat_id (primary) or username (fallback)
  let candidate = await findCandidateByChatId(supabase, chatId);

  if (!candidate && username) {
    candidate = await findCandidateByUsername(supabase, username);
  }

  if (!candidate) {
    await sendTelegramMessage(
      chatId,
      'Вибачте, не знайшов ваш профіль. Спочатку подайте заявку, натиснувши /start.'
    );
    return;
  }

  // Ensure chat_id is saved
  if (!candidate.telegram_chat_id) {
    await supabase
      .from('candidates')
      .update({ telegram_chat_id: chatId } as never)
      .eq('id', candidate.id);
  }

  // Log incoming message
  await supabase.from('candidate_conversations').insert({
    candidate_id: candidate.id,
    direction: 'inbound',
    message_type: 'candidate_response',
    content: text,
  } as never);

  // If questionnaire is in progress — accumulate answer parts
  const botSession = candidate.bot_session;
  if (botSession?.state === 'questionnaire_in_progress') {
    const parts = [...(botSession.current_answer_parts || []), text];
    await supabase
      .from('candidates')
      .update({
        bot_session: { ...botSession, current_answer_parts: parts } as never,
      } as never)
      .eq('id', candidate.id);
    return; // Don't classify, just accumulate
  }

  // Classify and handle other messages
  const hasReceivedTestTask = candidate.test_task_status === 'sent';
  const classification = await classifyResponse(text, {
    hasReceivedTestTask,
    testTaskDeadline: candidate.test_task_current_deadline
      ? new Date(candidate.test_task_current_deadline)
      : undefined,
  });

  switch (classification.category) {
    case 'request_deadline_extension': {
      const extensionRes = await fetch(`${BASE_URL}/api/test-task/extend-deadline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id, requestText: text }),
      });
      const extensionResult = await extensionRes.json() as { message: string };
      await sendTelegramMessage(chatId, extensionResult.message);
      break;
    }

    case 'test_task_submission': {
      await fetch(`${BASE_URL}/api/test-task/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          submissionText: text,
          candidateFeedback: null,
        }),
      });
      await sendTelegramMessage(
        chatId,
        'Дякую за виконання! Ми перевіримо твоє тестове і зв\'яжемося з тобою найближчим часом.'
      );
      break;
    }

    case 'positive_with_questions':
    case 'questions_about_job': {
      const { data: settingRaw } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'company_info')
        .single();
      const settingData = settingRaw as { value: string } | null;

      const { data: matchData } = await supabase
        .from('candidate_request_matches')
        .select(`
          request_id,
          requests!inner (
            title, description, salary_range, required_skills,
            location, employment_type, remote_policy, vacancy_info
          )
        `)
        .eq('candidate_id', candidate.id)
        .neq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const vacancyContext = matchData
        ? (() => {
            const req = (matchData as Record<string, unknown>).requests as Record<string, unknown>;
            return {
              title: req.title as string,
              description: (req.description as string | null) ?? null,
              salary_range: (req.salary_range as string | null) ?? null,
              required_skills: (req.required_skills as string | null) ?? null,
              location: (req.location as string | null) ?? null,
              employment_type: (req.employment_type as string | null) ?? null,
              remote_policy: (req.remote_policy as string | null) ?? null,
              vacancy_info: (req.vacancy_info as string | null) ?? null,
            };
          })()
        : undefined;

      const aiReply = await answerCandidateQuestion(
        text,
        settingData?.value ?? '',
        vacancyContext
      );

      await sendTelegramMessage(chatId, aiReply);

      await supabase.from('candidate_conversations').insert({
        candidate_id: candidate.id,
        direction: 'outbound',
        message_type: 'ai_reply',
        content: aiReply,
      } as never);
      break;
    }

    case 'negative': {
      await sendTelegramMessage(chatId, 'Дякуємо за відповідь! Якщо передумаєш — завжди можеш написати нам.');
      await supabase
        .from('candidates')
        .update({ outreach_status: 'declined' } as never)
        .eq('id', candidate.id);
      break;
    }

    default: {
      // Generic question or unknown — try to answer as a question about the job
      const { data: settingRaw } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'company_info')
        .single();
      const settingData = settingRaw as { value: string } | null;

      if (settingData?.value) {
        const aiReply = await answerCandidateQuestion(text, settingData.value);
        await sendTelegramMessage(chatId, aiReply);
        await supabase.from('candidate_conversations').insert({
          candidate_id: candidate.id,
          direction: 'outbound',
          message_type: 'ai_reply',
          content: aiReply,
        } as never);
      } else {
        await sendTelegramMessage(chatId, 'Дякую за повідомлення! Ми переглянемо і відповімо найближчим часом.');
      }
      break;
    }
  }
}

async function handleCallbackQuery(
  callbackQuery: NonNullable<TelegramUpdate['callback_query']>
): Promise<void> {
  if (!callbackQuery?.data) return;

  const data = callbackQuery.data;
  const chatId = callbackQuery.message?.chat?.id ?? callbackQuery.from.id;
  const messageId = callbackQuery.message?.message_id;

  const supabase = createServiceRoleClient();

  // ── start_questionnaire:{candidateId}:{requestId} ─────────
  if (data.startsWith('start_questionnaire:')) {
    const parts = data.split(':');
    const candidateId = parts[1];
    const requestId = parts[2];

    await answerCallbackQuery(callbackQuery.id);

    if (messageId && chatId) {
      await editTelegramReplyMarkup(chatId, messageId);
    }

    // Check if questionnaire already in progress
    const candidate = await findCandidateByChatId(supabase, chatId);
    if (candidate?.bot_session?.state === 'questionnaire_in_progress') {
      await sendTelegramMessage(chatId, 'Анкета вже в процесі! Відповідай на поточне питання і натискай кнопку "Наступне".');
      return;
    }

    // Log candidate response
    if (candidate) {
      await supabase.from('candidate_conversations').insert({
        candidate_id: candidateId,
        direction: 'inbound',
        message_type: 'candidate_response',
        content: 'Натиснув "Можемо починати 🚀"',
        metadata: { callback_data: data },
      } as never);

      await supabase
        .from('candidates')
        .update({ candidate_response: 'positive' } as never)
        .eq('id', candidateId);
    }

    await startQuestionnaire(supabase, chatId, candidateId, requestId);
    return;
  }

  // ── questionnaire_next ────────────────────────────────────
  if (data === 'questionnaire_next') {
    if (messageId && chatId) {
      await editTelegramReplyMarkup(chatId, messageId);
    }
    await handleQuestionnaireNext(supabase, chatId, callbackQuery.id);
    return;
  }

  // ── feedback buttons (legacy, keep for existing messages) ─
  const feedbackMatch = data.match(/^feedback_(easy|ok|hard|very_hard)_(.+)$/);
  if (feedbackMatch) {
    await answerCallbackQuery(callbackQuery.id, 'Дякуємо за фідбек!');

    const feedbackMap: Record<string, string> = {
      easy: 'Легко',
      ok: 'Нормально',
      hard: 'Складно',
      very_hard: 'Дуже складно',
    };

    const feedbackText = feedbackMap[feedbackMatch[1]] || feedbackMatch[1];
    const candidateId = feedbackMatch[2];

    await supabase
      .from('candidates')
      .update({ test_task_candidate_feedback: feedbackText } as never)
      .eq('id', candidateId);

    if (chatId) {
      await sendTelegramMessage(
        chatId,
        'Дякуємо за фідбек! Ми перевіримо твоє тестове найближчим часом і зв\'яжемося з тобою.'
      );
    }
    return;
  }

  // ── legacy outreach buttons (keep for old messages in flight) ──
  if (data.startsWith('outreach_yes:')) {
    const [, candidateId, requestId] = data.split(':');
    await answerCallbackQuery(callbackQuery.id, 'Дякуємо!');
    if (messageId && chatId) await editTelegramReplyMarkup(chatId, messageId);

    await supabase
      .from('candidates')
      .update({ candidate_response: 'positive' } as never)
      .eq('id', candidateId);

    await supabase.from('candidate_conversations').insert({
      candidate_id: candidateId,
      direction: 'inbound',
      message_type: 'candidate_response',
      content: 'Натиснув "Так, цікаво дізнатись більше" (legacy)',
      metadata: { callback_data: data },
    } as never);

    if (chatId && candidateId && requestId) {
      await startQuestionnaire(supabase, chatId, candidateId, requestId);
    }
    return;
  }

  if (data.startsWith('outreach_no:')) {
    const [, candidateId] = data.split(':');
    await answerCallbackQuery(callbackQuery.id, 'Зрозуміло, дякуємо!');
    if (messageId && chatId) await editTelegramReplyMarkup(chatId, messageId);

    if (chatId) {
      await sendTelegramMessage(chatId, 'Зрозуміло, дякуємо за відповідь! Успіхів тобі!');
    }

    await supabase
      .from('candidates')
      .update({
        pipeline_stage: 'outreach_declined',
        candidate_response: 'negative',
        outreach_status: 'declined',
      } as never)
      .eq('id', candidateId);

    await supabase.from('candidate_conversations').insert({
      candidate_id: candidateId,
      direction: 'inbound',
      message_type: 'candidate_response',
      content: 'Натиснув "Дякую, не зараз" (legacy)',
      metadata: { callback_data: data },
    } as never);
    return;
  }

  // Unhandled callback
  await answerCallbackQuery(callbackQuery.id);
}

// ─── Route handler ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    console.log('Telegram webhook received:', JSON.stringify(update).slice(0, 300));

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    if (update.message?.text) {
      await handleMessage(update.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true }); // Always 200 to Telegram
  }
}
