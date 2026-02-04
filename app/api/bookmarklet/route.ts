import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the bookmarklet source
    const bookmarkletPath = path.join(process.cwd(), 'public', 'bookmarklet', 'vamos-quick-check.js');
    let code = fs.readFileSync(bookmarkletPath, 'utf-8');

    // Get the app URL from environment or use a default
    let appUrl = 'http://localhost:3000';
    if (process.env.NEXTAUTH_URL) {
      appUrl = process.env.NEXTAUTH_URL;
    } else if (process.env.VERCEL_URL) {
      appUrl = `https://${process.env.VERCEL_URL}`;
    }

    // Replace placeholder with actual URL
    code = code.replace('APP_URL_PLACEHOLDER', appUrl);

    // Simple minification - be careful not to break regex patterns
    code = code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments only
      .replace(/\n+/g, ' ') // Replace newlines with space
      .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
      .trim();

    // Wrap in javascript: protocol
    const bookmarklet = `javascript:${encodeURIComponent(code)}`;

    return NextResponse.json({
      bookmarklet,
      appUrl,
    });
  } catch (error) {
    console.error('Failed to generate bookmarklet:', error);
    return NextResponse.json(
      { error: 'Failed to generate bookmarklet' },
      { status: 500 }
    );
  }
}
