/**
 * Результат парсингу PDF-резюме
 */
export interface ResumeData {
  /** Повний текст резюме */
  fullText: string;

  /** Екстраговані дані */
  extracted: {
    /** Досвід роботи (масив рядків) */
    experience: string[];

    /** Ключові навички */
    skills: string[];

    /** Освіта */
    education: string[];

    /** Контактна інформація */
    contact?: {
      email?: string;
      phone?: string;
      linkedin?: string;
      github?: string;
    };
  };

  /** Метадані PDF */
  metadata: {
    /** Кількість сторінок */
    pages: number;

    /** Розмір файлу в байтах */
    size?: number;
  };
}

/**
 * Помилка парсингу PDF
 */
export class PDFParseError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'PDFParseError';
  }
}
