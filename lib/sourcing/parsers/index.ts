import { detectPlatform, Platform } from '../platform-detector';
import { ParsedProfile, ParserResult } from './types';
import { parseGitHub } from './github-parser';
import { parseDOU } from './dou-parser';
import { parseDjinni } from './djinni-parser';
import { parseLinkedIn } from './linkedin-parser';
import { parseWorkUA } from './workua-parser';

export type { ParsedProfile, ParserResult } from './types';

export async function parseProfile(url: string): Promise<ParserResult> {
  const platform = detectPlatform(url);

  if (!platform) {
    return {
      success: false,
      error: 'Platform not supported. Supported platforms: LinkedIn, DOU, Djinni, Work.ua, GitHub',
    };
  }

  switch (platform) {
    case 'github':
      return await parseGitHub(url);
    case 'dou':
      return await parseDOU(url);
    case 'djinni':
      return await parseDjinni(url);
    case 'linkedin':
      return await parseLinkedIn(url);
    case 'workua':
      return await parseWorkUA(url);
    default:
      return {
        success: false,
        error: `Parser not implemented for platform: ${platform}`,
      };
  }
}

// Export individual parsers for direct use if needed
export { parseGitHub } from './github-parser';
export { parseDOU } from './dou-parser';
export { parseDjinni } from './djinni-parser';
export { parseLinkedIn } from './linkedin-parser';
export { parseWorkUA } from './workua-parser';
