/**
 * AI Prompts for Outreach Message Generation
 *
 * These prompts are used to generate personalized introduction and test task messages.
 */

import { Candidate, Request } from '@/lib/supabase/types';

export interface AIAnalysisResult {
  score: number;
  category: 'top_tier' | 'strong' | 'potential' | 'not_fit';
  summary: string;
  strengths: string[];
  concerns?: string[];
}

/**
 * Generate prompt for warm candidate introduction message
 */
export function WARM_CANDIDATE_INTRO_PROMPT(
  candidate: Candidate,
  analysis: AIAnalysisResult,
  bestMatch?: { request: Request; match_score: number }
): string {
  const candidateName = candidate.first_name;
  const skills = candidate.key_skills?.join(', ') || 'Не вказано';
  const aboutText = candidate.about_text || 'Не вказано';
  const whyVamos = candidate.why_vamos || 'Не вказано';
  const strengths = analysis.strengths.slice(0, 3).join(', ');

  return `
Ти — дружній та професійний HR-спеціаліст компанії Vamos.
Напиши персоналізоване привітальне повідомлення кандидату УКРАЇНСЬКОЮ мовою.

=== ДАНІ КАНДИДАТА ===
Ім'я: ${candidateName}
Про себе: ${aboutText}
Чому Vamos: ${whyVamos}
Навички: ${skills}

=== AI ОЦІНКА ===
Бал: ${analysis.score}/10
Категорія: ${analysis.category}
Сильні сторони: ${strengths}
Резюме: ${analysis.summary}

${bestMatch ? `
=== НАЙКРАЩА ПОЗИЦІЯ ===
Назва: ${bestMatch.request.title}
Match Score: ${bestMatch.match_score}/100
Опис: ${bestMatch.request.description || 'Не вказано'}
` : ''}

=== ВИМОГИ ДО ПОВІДОМЛЕННЯ ===
1. Починай з дружнього привітання на ім'я (без прізвища)
2. Подякуй за заявку та інтерес до Vamos
3. Вкажи 1-2 конкретні речі з профілю, які тебе вразили (з їхнього опису про себе або навичок)
4. ${bestMatch
    ? `Згадай позицію "${bestMatch.request.title}" як потенційну можливість для них`
    : 'Скажи, що є цікаві можливості для обговорення'}
5. Закінчуй м'яким закликом до дії - запитай чи готові вони пройти невелике тестове завдання
6. НЕ підписуй повідомлення (підпис буде доданий автоматично)

=== ЗАБОРОНЕНО ===
- Бути занадто формальним або офіційним (це не корпоративний лист)
- Використовувати кліше типу "Ваша кандидатура нас зацікавила", "З нетерпінням чекаємо"
- Обіцяти конкретні умови або зарплату
- Писати більше 120 слів
- Використовувати емодзі
- Звертатися на "Ви" з великої літери (використовуй "ти" або "ви" з маленької)

=== ТОНАЛЬНІСТЬ ===
Дружня, неформальна, але професійна. Як би написав молодий HR, який щиро зацікавлений у кандидаті.

Напиши ТІЛЬКИ текст повідомлення, без пояснень, метакоментарів чи лапок.
`.trim();
}

/**
 * Generate prompt for test task message
 */
export function TEST_TASK_MESSAGE_PROMPT(
  candidate: Candidate,
  request: Request,
  notionUrl: string
): string {
  return `
Напиши коротке повідомлення кандидату про тестове завдання УКРАЇНСЬКОЮ мовою.

=== ДАНІ ===
Ім'я кандидата: ${candidate.first_name}
Позиція: ${request.title}
Посилання на завдання: ${notionUrl}

=== ВИМОГИ ===
1. Коротке привітання
2. Подякуй за готовність виконати тестове
3. Дай посилання на Notion з тестовим завданням
4. Вкажи орієнтовний дедлайн (5 робочих днів)
5. Запропонуй написати, якщо виникнуть питання
6. НЕ підписуй (підпис автоматичний)

=== ЗАБОРОНЕНО ===
- Більше 80 слів
- Формальний тон
- Емодзі
- Тиск на кандидата

Напиши ТІЛЬКИ текст повідомлення без лапок.
`.trim();
}

/**
 * Mock introduction message for development
 */
export function MOCK_INTRO_MESSAGE(
  candidate: Candidate,
  bestMatch?: { request: Request }
): string {
  const name = candidate.first_name;
  const skills = candidate.key_skills?.slice(0, 2).join(' та ') || 'твої навички';

  if (bestMatch) {
    return `Привіт, ${name}!

Дякую за твою заявку до Vamos! Ми переглянули твій профіль і він нас дуже зацікавив.

Твій досвід з ${skills} виглядає дуже цікаво для нас. Зараз у нас відкрита позиція "${bestMatch.request.title}", яка може бути чудовим match для тебе.

Чи готовий ти пройти невелике тестове завдання? Це допоможе нам краще зрозуміти твої навички на практиці.`;
  }

  return `Привіт, ${name}!

Дякую за твою заявку до Vamos! Ми переглянули твій профіль і він нас дуже зацікавив.

Твій досвід з ${skills} виглядає дуже цікаво. У нас є кілька можливостей, які можуть тебе зацікавити.

Чи готовий ти пройти невелике тестове завдання? Це допоможе нам краще зрозуміти твої навички на практиці.`;
}

/**
 * Mock test task message for development
 */
/**
 * Generate prompt for test task approval message
 */
export function TEST_TASK_APPROVAL_PROMPT(
  candidate: Candidate,
  request: Request | null,
  evaluation: { score: number; evaluation: string }
): string {
  return `
Ти — дружній HR-спеціаліст компанії Vamos.
Напиши повідомлення кандидату, який УСПІШНО виконав тестове завдання. УКРАЇНСЬКОЮ мовою.

=== ДАНІ ===
Ім'я кандидата: ${candidate.first_name}
${request ? `Позиція: ${request.title}` : ''}
AI оцінка тестового: ${evaluation.score}/10
AI відгук: ${evaluation.evaluation}

=== ВИМОГИ ===
1. Привітай з успішним виконанням тестового
2. Дай 1-2 конкретні позитивні коментарі щодо виконання (на основі AI відгуку)
3. Повідом, що менеджер зв'яжеться найближчим часом, щоб домовитись про розмову
4. Закінчуй позитивно
5. НЕ підписуй повідомлення

=== ЗАБОРОНЕНО ===
- Більше 100 слів
- Формальний тон
- Емодзі
- Звертатися на "Ви" (використовуй "ти")
- Обіцяти конкретні умови або зарплату
- Вживати кліше

Напиши ТІЛЬКИ текст повідомлення без лапок.
`.trim();
}

/**
 * Generate prompt for test task rejection message
 */
export function TEST_TASK_REJECTION_PROMPT(
  candidate: Candidate,
  request: Request | null,
  evaluation: { score: number; evaluation: string }
): string {
  return `
Ти — дружній HR-спеціаліст компанії Vamos.
Напиши повідомлення кандидату, який НЕ пройшов тестове завдання. УКРАЇНСЬКОЮ мовою.
Повідомлення має бути ввічливим, конструктивним і мотивуючим.

=== ДАНІ ===
Ім'я кандидата: ${candidate.first_name}
${request ? `Позиція: ${request.title}` : ''}
AI оцінка тестового: ${evaluation.score}/10
AI відгук: ${evaluation.evaluation}

=== ВИМОГИ ===
1. Подякуй за час і зусилля
2. Дай 1-2 конкретні, конструктивні поради щодо того, що можна покращити (на основі AI відгуку)
3. НЕ кажи прямо "ти не пройшов" — скажи, що наразі вирішили не продовжувати
4. Побажай успіхів і запроси спробувати знову в майбутньому
5. НЕ підписуй повідомлення

=== ЗАБОРОНЕНО ===
- Більше 120 слів
- Формальний тон
- Емодзі
- Звертатися на "Ви" (використовуй "ти")
- Бути різким або зневажливим
- Кліше типу "на жаль, змушені повідомити"

Напиши ТІЛЬКИ текст повідомлення без лапок.
`.trim();
}

/**
 * Generate prompt for re-outreach to a candidate from the recommended pool.
 * Used when adding a candidate from the "Recommended" tab to a new vacancy.
 * The candidate already knows Vamos (was in a previous pipeline) and passed
 * questionnaire with strong scores on competencies relevant to the new vacancy.
 */
export function RE_OUTREACH_PROMPT(
  candidate: Candidate,
  request: Request,
  competencyScores: { competency_name: string; score: number; comment: string }[]
): string {
  const topScores = competencyScores
    .filter((c) => c.score >= 7)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const strengthsList = topScores
    .map((c) => `${c.competency_name} (${c.score}/10)`)
    .join(', ');

  return `
Ти — дружній HR-спеціаліст компанії Vamos.
Напиши персоналізоване повідомлення кандидату, з яким ми вже спілкувались раніше. УКРАЇНСЬКОЮ мовою.

=== ДАНІ КАНДИДАТА ===
Ім'я: ${candidate.first_name}

=== НОВА ПОЗИЦІЯ ===
Назва: ${request.title}
Опис: ${request.description || 'Не вказано'}
${request.salary_range ? `Зарплата: ${request.salary_range}` : ''}
${request.location ? `Локація: ${request.location}` : ''}

=== РЕЗУЛЬТАТИ АНКЕТИ ===
Сильні сторони кандидата: ${strengthsList || 'Висока загальна оцінка'}

=== ВИМОГИ ДО ПОВІДОМЛЕННЯ ===
1. Починай з привітання на ім'я — тон "ми вже знайомі"
2. Скажи, що слідкуємо за кандидатами в базі і маємо нову можливість
3. Згадай 1-2 конкретні сильні сторони з анкети — поясни, чому вони підходять для цієї позиції
4. Коротко представ нову вакансію "${request.title}"
5. Запитай, чи цікаво дізнатись більше
6. НЕ підписуй повідомлення

=== ЗАБОРОНЕНО ===
- Згадувати причину відмови раніше або чому попередній процес не склався
- Писати більше 120 слів
- Формальний тон
- Емодзі
- Звертатися на "Ви" (використовуй "ти")
- Кліше та шаблонні фрази

=== ТОНАЛЬНІСТЬ ===
Дружня, людяна, щира. Як написав би колега, який щиро думає, що ця людина підійде для нової позиції.

Напиши ТІЛЬКИ текст повідомлення, без пояснень, метакоментарів чи лапок.
`.trim();
}

export function MOCK_TEST_TASK_MESSAGE(
  candidate: Candidate,
  request: Request,
  notionUrl: string
): string {
  return `Привіт, ${candidate.first_name}!

Дякую за готовність пройти тестове завдання для позиції "${request.title}"!

Ось посилання на завдання: ${notionUrl}

Орієнтовний дедлайн — 5 робочих днів, але якщо потрібно більше часу, дай знати. Якщо виникнуть питання — пиши, із задоволенням допоможемо!`;
}
