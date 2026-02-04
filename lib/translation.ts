import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface TranslationInput {
  from: string;
  to: string;
  texts: {
    bio?: string;
    why_vamos?: string;
    skills?: string;
    availability?: string;
    how_found_us?: string;
    custom_answers?: Record<string, string>;
  };
}

interface TranslationOutput {
  bio_translated?: string;
  why_vamos_translated?: string;
  skills_translated?: string;
  availability_translated?: string;
  how_found_us_translated?: string;
  custom_answers_translated?: Record<string, string>;
}

/**
 * Translates candidate content from one language to Ukrainian using Claude AI.
 * Preserves technical terms, programming languages, frameworks, and company names.
 */
export async function translateCandidateContent(
  input: TranslationInput
): Promise<TranslationOutput> {
  // If already in Ukrainian, no translation needed
  if (input.from === 'uk') {
    return {
      bio_translated: input.texts.bio,
      why_vamos_translated: input.texts.why_vamos,
      skills_translated: input.texts.skills,
      availability_translated: input.texts.availability,
      how_found_us_translated: input.texts.how_found_us,
      custom_answers_translated: input.texts.custom_answers,
    };
  }

  const languageNames: Record<string, string> = {
    uk: 'Ukrainian',
    en: 'English',
    tr: 'Turkish',
    es: 'Spanish',
  };

  const fromLang = languageNames[input.from] || input.from;
  const toLang = languageNames[input.to] || input.to;

  // Collect non-empty texts to translate
  const textsToTranslate: Record<string, string> = {};
  if (input.texts.bio) textsToTranslate.bio = input.texts.bio;
  if (input.texts.why_vamos) textsToTranslate.why_vamos = input.texts.why_vamos;
  if (input.texts.skills) textsToTranslate.skills = input.texts.skills;
  if (input.texts.availability) textsToTranslate.availability = input.texts.availability;
  if (input.texts.how_found_us) textsToTranslate.how_found_us = input.texts.how_found_us;

  // Add custom answers with prefixed keys
  if (input.texts.custom_answers) {
    Object.entries(input.texts.custom_answers).forEach(([key, value]) => {
      if (value) {
        textsToTranslate[`custom_${key}`] = value;
      }
    });
  }

  // If nothing to translate, return empty result
  if (Object.keys(textsToTranslate).length === 0) {
    return {};
  }

  const prompt = `You are a professional translator for a hiring platform. Translate the following candidate application texts from ${fromLang} to ${toLang}.

CRITICAL RULES:
1. Preserve ALL technical terms, programming languages, frameworks, tools, and company names in their original form
2. Do NOT translate: React, JavaScript, Python, TypeScript, Node.js, Docker, AWS, Kubernetes, Git, GitHub, LinkedIn, Google, Microsoft, etc.
3. Do NOT translate: API, UI, UX, AI, ML, DevOps, CI/CD, REST, GraphQL, SQL, NoSQL, etc.
4. Maintain professional and natural tone
5. Keep formatting (line breaks, bullet points if any)
6. Translate meaning, not word-by-word
7. Keep proper nouns and brand names unchanged

INPUT TEXTS:
${JSON.stringify(textsToTranslate, null, 2)}

Return ONLY a valid JSON object with translated texts using the same keys. Example format:
{
  "bio": "translated bio text here",
  "why_vamos": "translated why vamos text here",
  "skills": "translated skills text here"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse the JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse translation response as JSON');
    }

    const translated = JSON.parse(jsonMatch[0]);

    // Separate custom answers from regular fields
    const custom_answers_translated: Record<string, string> = {};
    const regularTranslations: Record<string, string> = {};

    Object.entries(translated).forEach(([key, value]) => {
      if (key.startsWith('custom_')) {
        const originalKey = key.replace('custom_', '');
        custom_answers_translated[originalKey] = value as string;
      } else {
        regularTranslations[key] = value as string;
      }
    });

    return {
      bio_translated: regularTranslations.bio,
      why_vamos_translated: regularTranslations.why_vamos,
      skills_translated: regularTranslations.skills,
      availability_translated: regularTranslations.availability,
      how_found_us_translated: regularTranslations.how_found_us,
      custom_answers_translated:
        Object.keys(custom_answers_translated).length > 0
          ? custom_answers_translated
          : undefined,
    };
  } catch (error) {
    console.error('Translation error:', error);
    // On error, return original texts as fallback
    return {
      bio_translated: input.texts.bio,
      why_vamos_translated: input.texts.why_vamos,
      skills_translated: input.texts.skills,
      availability_translated: input.texts.availability,
      how_found_us_translated: input.texts.how_found_us,
      custom_answers_translated: input.texts.custom_answers,
    };
  }
}

/**
 * Returns the localized name of a language code
 */
export function getLanguageName(code: string, displayLang: string = 'uk'): string {
  const names: Record<string, Record<string, string>> = {
    uk: {
      uk: 'Українська',
      en: 'Англійська',
      tr: 'Турецька',
      es: 'Іспанська',
    },
    en: {
      uk: 'Ukrainian',
      en: 'English',
      tr: 'Turkish',
      es: 'Spanish',
    },
    tr: {
      uk: 'Ukraynaca',
      en: 'İngilizce',
      tr: 'Türkçe',
      es: 'İspanyolca',
    },
    es: {
      uk: 'Ucraniano',
      en: 'Inglés',
      tr: 'Turco',
      es: 'Español',
    },
  };

  return names[displayLang]?.[code] || code.toUpperCase();
}

/**
 * Returns the flag emoji for a language code
 */
export function getLanguageFlag(code: string): string {
  const flags: Record<string, string> = {
    uk: '🇺🇦',
    en: '🇬🇧',
    tr: '🇹🇷',
    es: '🇪🇸',
  };

  return flags[code] || '🌐';
}

/**
 * Detects language from text content based on character patterns
 * Used for cold sourcing when browser language is not available
 */
export function detectLanguageFromText(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'en';
  }

  // Check for Cyrillic characters (Ukrainian)
  if (/[іїєґІЇЄҐ]/.test(text)) {
    return 'uk';
  }

  // Check for general Cyrillic (could be Russian, but default to Ukrainian for this app)
  if (/[а-яА-Я]/.test(text) && !/[іїєґІЇЄҐ]/.test(text)) {
    // Contains Cyrillic but no Ukrainian-specific letters
    // Still default to Ukrainian since this is a Ukrainian company
    return 'uk';
  }

  // Check for Turkish-specific characters
  if (/[ığşçöüĞİŞÇÖÜ]/.test(text)) {
    return 'tr';
  }

  // Check for Spanish-specific characters
  if (/[ñáéíóúüÑÁÉÍÓÚÜ¿¡]/.test(text)) {
    return 'es';
  }

  // Default to English for Latin alphabet without special characters
  return 'en';
}
