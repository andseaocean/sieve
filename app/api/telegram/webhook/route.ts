import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { classifyResponse } from '@/lib/ai/classifyResponse';
import { analyzeWithClaude } from '@/lib/ai/claude';
import { generateTestTaskMessage } from '@/lib/outreach/message-generator';
import { Candidate, Request } from '@/lib/supabase/types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';

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
    from: { id: number };
    message?: TelegramMessage;
    data?: string;
  };
}

async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: Record<string, unknown>
): Promise<boolean> {
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
  return response.ok;
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || 'OK',
      }),
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    console.log('Telegram webhook received:', JSON.stringify(update).slice(0, 500));

    // Handle callback queries (feedback buttons)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    // Handle text messages
    if (update.message?.text) {
      await handleMessage(update.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id;
  const text = message.text || '';
  const telegramUserId = message.from.id.toString();

  // Handle /start command
  if (text.startsWith('/start')) {
    await sendTelegramMessage(chatId,
      `Привіт, ${message.from.first_name}! Я Vamos Hiring Bot.\n\nШукаєте роботу в інноваційній команді? Натисніть кнопку нижче!`,
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

  const supabase = createServiceRoleClient();

  // Find candidate by telegram username
  const telegramUsername = message.from.username;
  let candidate: Candidate | null = null;

  if (telegramUsername) {
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .eq('telegram_username', telegramUsername)
      .single();
    candidate = data as Candidate | null;
  }

  if (!candidate) {
    console.log(`Candidate not found. Telegram username: ${telegramUsername}, userId: ${telegramUserId}`);
    await sendTelegramMessage(chatId,
      'Вибачте, не можу знайти ваш профіль. Будь ласка, спочатку подайте заявку через форму.'
    );
    return;
  }

  // Log incoming message
  await supabase.from('candidate_conversations').insert({
    candidate_id: candidate.id,
    direction: 'inbound',
    message_type: 'candidate_response',
    content: text,
  } as never);

  // Classify response
  const hasReceivedTestTask = candidate.test_task_status === 'sent';
  const classification = await classifyResponse(text, {
    hasReceivedTestTask,
    testTaskDeadline: candidate.test_task_current_deadline
      ? new Date(candidate.test_task_current_deadline)
      : undefined,
  });

  // Handle based on classification
  switch (classification.category) {
    case 'positive_ready': {
      // Send test task immediately
      await sendTestTaskDirectly(chatId, candidate, supabase);
      break;
    }

    case 'request_deadline_extension': {
      const extensionRes = await fetch(`${BASE_URL}/api/test-task/extend-deadline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          requestText: text,
        }),
      });
      const extensionResult = await extensionRes.json();
      await sendTelegramMessage(chatId, extensionResult.message);
      break;
    }

    case 'test_task_submission': {
      // Save submission
      await fetch(`${BASE_URL}/api/test-task/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          submissionText: text,
          candidateFeedback: null,
        }),
      });

      // Ask for feedback
      await sendTelegramMessage(chatId,
        'Дякую за виконання! Поділіться враженнями про тестове завдання:',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Легко', callback_data: `feedback_easy_${candidate.id}` },
                { text: 'Нормально', callback_data: `feedback_ok_${candidate.id}` },
              ],
              [
                { text: 'Складно', callback_data: `feedback_hard_${candidate.id}` },
                { text: 'Дуже складно', callback_data: `feedback_very_hard_${candidate.id}` },
              ],
            ],
          },
        }
      );
      break;
    }

    case 'positive_with_questions':
    case 'questions_about_job': {
      // Get request info for context
      const { data: matchData } = await supabase
        .from('candidate_request_matches')
        .select('request_id')
        .eq('candidate_id', candidate.id)
        .order('match_score', { ascending: false })
        .limit(1)
        .single();

      let req: Record<string, unknown> | null = null;
      if (matchData) {
        const { data: reqData } = await supabase
          .from('requests')
          .select('*')
          .eq('id', (matchData as Record<string, unknown>).request_id as string)
          .single();
        req = reqData as Record<string, unknown> | null;
      }

      const aiReply = await generateAnswerToQuestions(text, candidate, req);
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
      await sendTelegramMessage(chatId, 'Дякуємо за відповідь! Якщо передумаєте, завжди можете написати нам.');
      await supabase
        .from('candidates')
        .update({ outreach_status: 'declined' } as never)
        .eq('id', candidate.id);
      break;
    }

    default: {
      await sendTelegramMessage(chatId, 'Дякую за повідомлення! Ми переглянемо і відповімо найближчим часом.');
      break;
    }
  }
}

async function sendTestTaskDirectly(
  chatId: number,
  candidate: Candidate,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  try {
    // Prevent duplicate sending
    const status = candidate.test_task_status as string | null;
    if (status && status !== 'not_sent') {
      if (status === 'sent' || status === 'scheduled') {
        await sendTelegramMessage(chatId, 'Тестове завдання вже надіслано! Перевірте попередні повідомлення.');
      } else if (status === 'submitted') {
        await sendTelegramMessage(chatId, 'Ви вже здали тестове завдання. Очікуйте на результати!');
      }
      return;
    }

    // Find the matching request
    const { data: matchData } = await supabase
      .from('candidate_request_matches')
      .select('request_id')
      .eq('candidate_id', candidate.id)
      .order('match_score', { ascending: false })
      .limit(1)
      .single();

    const match = matchData as { request_id: string } | null;
    if (!match) {
      await sendTelegramMessage(chatId, 'Наразі немає відкритих позицій для тестового завдання. Ми повідомимо, коли з\'явиться!');
      return;
    }

    const { data: reqData } = await supabase
      .from('requests')
      .select('*')
      .eq('id', match.request_id)
      .single();

    const req = reqData as Request | null;
    if (!req || !req.test_task_url) {
      await sendTelegramMessage(chatId, 'Тестове завдання для цієї позиції ще готується. Ми надішлемо його найближчим часом!');
      return;
    }

    // Generate message
    const testTaskMessage = await generateTestTaskMessage(candidate, req, req.test_task_url);

    // Calculate deadline
    const now = new Date();
    const deadlineDays = req.test_task_deadline_days || 3;
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + deadlineDays);
    deadline.setHours(18, 0, 0, 0);

    // Send via Telegram
    await sendTelegramMessage(chatId, testTaskMessage);

    // Update candidate status
    await supabase
      .from('candidates')
      .update({
        test_task_status: 'sent',
        test_task_sent_at: now.toISOString(),
        test_task_original_deadline: deadline.toISOString(),
        test_task_current_deadline: deadline.toISOString(),
      } as never)
      .eq('id', candidate.id);

    // Log in conversations
    await supabase.from('candidate_conversations').insert({
      candidate_id: candidate.id,
      direction: 'outbound',
      message_type: 'test_task',
      content: testTaskMessage,
      metadata: {
        deadline: deadline.toISOString(),
        deadline_days: deadlineDays,
        sent_directly: true,
      },
    } as never);

    console.log(`Test task sent directly to candidate ${candidate.id}, deadline: ${deadline.toISOString()}`);
  } catch (error) {
    console.error('Error sending test task directly:', error);
    await sendTelegramMessage(chatId, 'Виникла помилка при надсиланні тестового завдання. Спробуємо ще раз пізніше.');
  }
}

async function handleCallbackQuery(callbackQuery: TelegramUpdate['callback_query']) {
  if (!callbackQuery?.data) return;

  await answerCallbackQuery(callbackQuery.id, 'Дякуємо за фідбек!');

  const data = callbackQuery.data;
  const feedbackMatch = data.match(/^feedback_(easy|ok|hard|very_hard)_(.+)$/);

  if (!feedbackMatch) return;

  const feedbackMap: Record<string, string> = {
    easy: 'Легко',
    ok: 'Нормально',
    hard: 'Складно',
    very_hard: 'Дуже складно',
  };

  const feedbackType = feedbackMatch[1];
  const candidateId = feedbackMatch[2];
  const feedbackText = feedbackMap[feedbackType] || feedbackType;

  const supabase = createServiceRoleClient();

  await supabase
    .from('candidates')
    .update({ test_task_candidate_feedback: feedbackText } as never)
    .eq('id', candidateId);

  if (callbackQuery.message?.chat?.id) {
    await sendTelegramMessage(
      callbackQuery.message.chat.id,
      `Дякуємо за фідбек! Ми перевіримо ваше тестове найближчим часом і зв'яжемося з вами.`
    );
  }
}

async function generateAnswerToQuestions(
  question: string,
  candidate: Record<string, unknown>,
  request: Record<string, unknown> | null
): Promise<string> {
  const prompt = `Ти — дружній HR-спеціаліст компанії Vamos (AI-first tech company).
Кандидат ${candidate.first_name} задає питання. Дай коротку, дружню відповідь УКРАЇНСЬКОЮ.

${request ? `Позиція: ${request.title}\nОпис: ${request.description || 'Не вказано'}` : ''}

Питання кандидата: "${question}"

Правила:
- Відповідай коротко (2-3 речення максимум)
- Будь дружнім, але не обіцяй конкретних умов (зарплату тощо)
- Якщо не знаєш відповіді, скажи що уточниш у команди
- Наприкінці м'яко запитай чи готові вони пройти тестове завдання
- НЕ використовуй емодзі
- Пиши ТІЛЬКИ текст відповіді`;

  try {
    return await analyzeWithClaude(prompt);
  } catch {
    return 'Дякую за запитання! Уточню деталі у команди і повернуся з відповіддю найближчим часом.';
  }
}
