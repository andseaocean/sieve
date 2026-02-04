import { extractUsername } from '../platform-detector';
import { ParsedProfile, ParserResult } from './types';

interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  email: string | null;
  blog: string | null;
  company: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

interface GitHubRepo {
  name: string;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
}

function splitName(fullName: string | null, username: string): { first_name: string; last_name: string } {
  if (!fullName) {
    return { first_name: username, last_name: '' };
  }

  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '' };
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  };
}

function calculateExperienceYears(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const years = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365));
  return Math.max(1, years);
}

export async function parseGitHub(url: string): Promise<ParserResult> {
  try {
    const username = extractUsername(url, 'github');

    if (!username) {
      return {
        success: false,
        error: 'Could not extract GitHub username from URL',
      };
    }

    // Fetch user data from GitHub API
    const userResponse = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        // Add GitHub token if available for higher rate limits
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        }),
      },
    });

    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        return {
          success: false,
          error: 'GitHub user not found',
        };
      }
      return {
        success: false,
        error: `GitHub API error: ${userResponse.status}`,
      };
    }

    const userData: GitHubUser = await userResponse.json();

    // Fetch user's repos to analyze languages
    const reposResponse = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `token ${process.env.GITHUB_TOKEN}`,
          }),
        },
      }
    );

    let topLanguages: string[] = [];
    let skills: string[] = [];

    if (reposResponse.ok) {
      const repos: GitHubRepo[] = await reposResponse.json();

      // Count language occurrences (excluding forks)
      const languageCounts: Record<string, number> = {};
      repos
        .filter((repo) => !repo.fork && repo.language)
        .forEach((repo) => {
          const lang = repo.language!;
          languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        });

      // Sort by frequency and get top languages
      topLanguages = Object.entries(languageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([lang]) => lang);

      skills = [...topLanguages];

      // Add common skills based on detected languages
      if (topLanguages.includes('JavaScript') || topLanguages.includes('TypeScript')) {
        if (!skills.includes('Node.js')) skills.push('Node.js');
      }
      if (topLanguages.includes('Python')) {
        skills.push('Python');
      }
    }

    const { first_name, last_name } = splitName(userData.name, userData.login);

    const profile: ParsedProfile = {
      platform: 'github',
      name: userData.name || userData.login,
      first_name,
      last_name,
      username: userData.login,
      current_position: userData.company ? `Developer at ${userData.company}` : 'Software Developer',
      company: userData.company || undefined,
      location: userData.location || undefined,
      skills,
      experience_years: calculateExperienceYears(userData.created_at),
      about: userData.bio || undefined,
      profile_url: userData.html_url,
      email: userData.email || undefined,
      github_url: userData.html_url,
      portfolio_url: userData.blog || undefined,
      avatar_url: userData.avatar_url,
      top_languages: topLanguages,
      total_repos: userData.public_repos,
      followers: userData.followers,
      raw_data: {
        github_user: userData,
      },
    };

    return {
      success: true,
      profile,
    };
  } catch (error) {
    console.error('Error parsing GitHub profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse GitHub profile',
    };
  }
}
