import { Platform } from '../platform-detector';

export interface ParsedProfile {
  platform: Platform;
  name: string;
  first_name: string;
  last_name: string;
  current_position?: string;
  company?: string;
  location?: string;
  skills: string[];
  experience_years?: number;
  about?: string;
  profile_url: string;
  email?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  avatar_url?: string;
  // GitHub specific
  username?: string;
  top_languages?: string[];
  total_repos?: number;
  followers?: number;
  // Additional metadata
  raw_data?: Record<string, unknown>;
}

export interface ParserResult {
  success: boolean;
  profile?: ParsedProfile;
  error?: string;
}

export type ProfileParser = (url: string) => Promise<ParserResult>;
