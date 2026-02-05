/**
 * Language utility functions for client-side use
 * These are separated from translation.ts to avoid loading Anthropic SDK in browser
 */

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
