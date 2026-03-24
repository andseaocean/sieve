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
  vacancy_info?: string | null;
}

export async function answerCandidateQuestion(
  question: string,
  companyInfo: string,
  vacancyContext?: VacancyContext
): Promise<string> {
  const vacancyInfoBlock = vacancyContext?.vacancy_info?.trim()
    ? `## Специфічна інформація по вакансії "${vacancyContext.title}"\n${vacancyContext.vacancy_info}\n\n`
    : '';

  const vacancySection = vacancyContext
    ? `
## Деталі вакансії
Посада: ${vacancyContext.title}
Зарплата: ${vacancyContext.salary_range || 'не вказано'}
Локація: ${vacancyContext.location || 'не вказано'}
Зайнятість: ${vacancyContext.employment_type || 'не вказано'}
Remote: ${vacancyContext.remote_policy || 'не вказано'}`
    : '';

  const systemPrompt = `Ти — HR-асистент компанії Vamos. Відповідай на питання кандидата коротко, дружньо та по суті. Якщо інформації немає — чесно скажи, що уточниш у рекрутера.

${vacancyInfoBlock}${vacancySection}

## Загальна інформація про компанію
${companyInfo}

Правила:
- Відповідай ТІЛЬКИ на основі наданої інформації
- Якщо відповіді немає — скажи: "Я уточню це у команди і дам відповідь найближчим часом 🙏"
- Відповідай тією ж мовою, якою написав кандидат
- Будь коротким і дружнім (2-4 речення максимум)
- Не вигадуй факти`;

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
