import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface VacancyContext {
  title: string;
  description: string | null;
  salary_range: string | null;
  required_skills: string | null;
  location: string | null;
  employment_type: string | null;
  remote_policy: string | null;
}

export async function answerCandidateQuestion(
  question: string,
  companyInfo: string,
  vacancyContext?: VacancyContext
): Promise<string> {
  const vacancySection = vacancyContext
    ? `
ІНФОРМАЦІЯ ПРО ВАКАНСІЮ "${vacancyContext.title}":
- Зарплатна вилка: ${vacancyContext.salary_range || 'наразі погоджується'}
- Локація: ${vacancyContext.location || 'не вказано'}
- Формат: ${vacancyContext.employment_type || 'не вказано'}, ${vacancyContext.remote_policy || 'не вказано'}
- Вимоги: ${vacancyContext.required_skills || 'не вказано'}
- Опис: ${vacancyContext.description || 'не вказано'}`
    : '';

  const systemPrompt = `Ти — дружній HR-асистент компанії Vamos. Відповідаєш на питання кандидата в Telegram.

Правила:
- Відповідай ТІЛЬКИ на основі наданої інформації нижче
- Якщо відповіді немає в інформації — скажи: "Я уточню це у команди і дам відповідь найближчим часом 🙏"
- Відповідай тією ж мовою, якою написав кандидат
- Будь коротким і дружнім (2-4 речення максимум)
- Не вигадуй факти

ІНФОРМАЦІЯ ПРО КОМПАНІЮ:
${companyInfo}
${vacancySection}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: question,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    return textContent.text;
  } catch {
    return 'Я уточню це у команди і дам відповідь найближчим часом 🙏';
  }
}
