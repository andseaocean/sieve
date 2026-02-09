import { ResumeData } from './types';
import { cleanText } from './parser';
import { analyzeWithClaude } from '@/lib/ai/claude';

/**
 * Екстрагує структуровані дані з тексту резюме за допомогою AI
 */
export async function extractResumeData(
  fullText: string,
  pages: number,
  size: number
): Promise<ResumeData> {
  const cleanedText = cleanText(fullText);

  // Якщо тексту замало — повертаємо базову структуру
  if (cleanedText.length < 50) {
    return {
      fullText: cleanedText,
      extracted: {
        experience: [],
        skills: [],
        education: [],
      },
      metadata: { pages, size },
    };
  }

  const prompt = `
Проаналізуй це резюме та витягни структуровану інформацію.

<resume>
${cleanedText.slice(0, 8000)}
</resume>

Поверни результат у форматі JSON:
{
  "experience": ["посада 1 в компанії X (2020-2023)", "посада 2 в компанії Y (2018-2020)"],
  "skills": ["JavaScript", "React", "Node.js"],
  "education": ["Університет X, Факультет Y (2015-2019)"],
  "contact": {
    "email": "email@example.com або null",
    "phone": "+380... або null",
    "linkedin": "URL або null",
    "github": "URL або null"
  }
}

Важливо:
- experience: Перераховуй досвід в хронологічному порядку (від новішого до старішого)
- skills: Тільки технічні навички та інструменти
- education: Формальна освіта (університети, курси)
- contact: Витягуй тільки якщо явно вказано в резюме

Якщо щось не знайдено - повертай порожній масив [] або null.
Поверни ТІЛЬКИ JSON, без додаткового тексту.
`;

  try {
    const result = await analyzeWithClaude(prompt);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const extracted = JSON.parse(jsonMatch[0]);

    return {
      fullText: cleanedText,
      extracted: {
        experience: extracted.experience || [],
        skills: extracted.skills || [],
        education: extracted.education || [],
        contact: extracted.contact || undefined,
      },
      metadata: { pages, size },
    };
  } catch (error) {
    console.error('Resume extraction error:', error);

    // Fallback: повертаємо хоча б текст
    return {
      fullText: cleanedText,
      extracted: {
        experience: [],
        skills: [],
        education: [],
      },
      metadata: { pages, size },
    };
  }
}

/**
 * Форматує екстраговані дані для використання в AI-промптах
 */
export function formatResumeForAnalysis(resumeData: ResumeData): string {
  const { extracted } = resumeData;

  let formatted = '--- RESUME DATA ---\n\n';

  if (extracted.experience.length > 0) {
    formatted += 'WORK EXPERIENCE:\n';
    extracted.experience.forEach((exp, i) => {
      formatted += `${i + 1}. ${exp}\n`;
    });
    formatted += '\n';
  }

  if (extracted.skills.length > 0) {
    formatted += 'TECHNICAL SKILLS:\n';
    formatted += extracted.skills.join(', ') + '\n\n';
  }

  if (extracted.education.length > 0) {
    formatted += 'EDUCATION:\n';
    extracted.education.forEach((edu, i) => {
      formatted += `${i + 1}. ${edu}\n`;
    });
    formatted += '\n';
  }

  if (extracted.contact) {
    const contacts = [];
    if (extracted.contact.email) contacts.push(`Email: ${extracted.contact.email}`);
    if (extracted.contact.phone) contacts.push(`Phone: ${extracted.contact.phone}`);
    if (extracted.contact.linkedin) contacts.push(`LinkedIn: ${extracted.contact.linkedin}`);
    if (extracted.contact.github) contacts.push(`GitHub: ${extracted.contact.github}`);

    if (contacts.length > 0) {
      formatted += 'CONTACT:\n';
      formatted += contacts.join('\n') + '\n\n';
    }
  }

  formatted += '--- END RESUME ---\n';

  return formatted;
}
