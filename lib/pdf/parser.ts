import { PDFParseError } from './types';

/**
 * Динамічно завантажує PDFParse (pdf-parse v2 використовує canvas/workers,
 * які можуть не працювати при статичному імпорті на Vercel)
 */
async function getPDFParse() {
  const { PDFParse } = await import('pdf-parse');
  return PDFParse;
}

/**
 * Завантажує та парсить PDF за URL
 */
export async function parsePDFFromURL(
  resumeUrl: string
): Promise<{ text: string; pages: number; size: number }> {
  try {
    const response = await fetch(resumeUrl);

    if (!response.ok) {
      throw new PDFParseError(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const PDFParse = await getPDFParse();
    const parser = new PDFParse({ data, verbosity: 0 });
    const result = await parser.getText();

    return {
      text: result.text,
      pages: result.total,
      size: arrayBuffer.byteLength,
    };
  } catch (error) {
    if (error instanceof PDFParseError) {
      throw error;
    }

    console.error('PDF parsing error:', error);
    throw new PDFParseError(
      'Failed to parse PDF file',
      error as Error
    );
  }
}

/**
 * Парсить PDF з Buffer
 */
export async function parsePDFFromBuffer(
  buffer: Buffer
): Promise<{ text: string; pages: number; size: number }> {
  try {
    const data = new Uint8Array(buffer);
    const PDFParse = await getPDFParse();
    const parser = new PDFParse({ data, verbosity: 0 });
    const result = await parser.getText();

    return {
      text: result.text,
      pages: result.total,
      size: buffer.length,
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new PDFParseError(
      'Failed to parse PDF buffer',
      error as Error
    );
  }
}

/**
 * Очищує текст від зайвих символів та форматування
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
