import { ParsedProfile, ParserResult } from './types';

// LinkedIn parser - LIMITED functionality due to LinkedIn's strict policies
// Only works with public profile data that doesn't require authentication

function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '' };
  }
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  };
}

export async function parseLinkedIn(url: string): Promise<ParserResult> {
  try {
    // LinkedIn heavily restricts scraping and requires authentication
    // For MVP, we'll provide a limited parser that extracts what's publicly visible
    // In production, consider using LinkedIn's official API with proper OAuth

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      // LinkedIn often redirects to login page for non-public profiles
      if (response.status === 403 || response.status === 401) {
        return {
          success: false,
          error: 'LinkedIn profile requires authentication. Please ensure the profile is public or use a different platform.',
        };
      }
      return {
        success: false,
        error: `Failed to fetch LinkedIn profile: ${response.status}`,
      };
    }

    const html = await response.text();

    // Check if we got redirected to login page
    if (html.includes('authwall') || html.includes('login') || html.includes('sign-in')) {
      return {
        success: false,
        error: 'LinkedIn requires authentication to view this profile. The profile might be private.',
      };
    }

    // Extract data from public profile HTML
    // LinkedIn's public profile structure changes frequently, so this may need updates

    // Extract name
    const nameMatch = html.match(/<h1[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                      html.match(/<title>([^|<]+)/i);
    let name = nameMatch ? nameMatch[1].trim() : 'Unknown';
    // Clean up name from title tag
    if (name.includes(' - ') || name.includes(' | ')) {
      name = name.split(/[-|]/)[0].trim();
    }

    // Extract headline (current position)
    const headlineMatch = html.match(/<h2[^>]*class="[^"]*top-card-layout__headline[^"]*"[^>]*>([^<]+)<\/h2>/i) ||
                          html.match(/headline[^>]*>([^<]+)</i);
    const headline = headlineMatch ? headlineMatch[1].trim() : undefined;

    // Extract location
    const locationMatch = html.match(/<span[^>]*class="[^"]*top-card-layout__first-subline[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                          html.match(/location[^>]*>([^<]+)</i);
    const location = locationMatch ? locationMatch[1].trim() : undefined;

    // Extract about section
    const aboutMatch = html.match(/<section[^>]*class="[^"]*summary[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    let about = aboutMatch ? aboutMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;
    if (about && about.length > 500) {
      about = about.substring(0, 500) + '...';
    }

    // Try to extract skills (limited on public profiles)
    const skills: string[] = [];
    const skillMatches = html.matchAll(/<span[^>]*class="[^"]*skill[^"]*"[^>]*>([^<]+)<\/span>/gi);
    for (const match of skillMatches) {
      const skill = match[1].trim();
      if (skill && skill.length < 30 && !skills.includes(skill)) {
        skills.push(skill);
      }
    }

    // Parse headline for skills if no explicit skills found
    if (skills.length === 0 && headline) {
      // Common tech terms that might appear in headline
      const techTerms = ['JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Angular', 'Vue', 'Node.js', 'AWS', 'Azure', 'GCP', 'DevOps', 'ML', 'AI', 'Data', 'Full Stack', 'Frontend', 'Backend'];
      techTerms.forEach(term => {
        if (headline.toLowerCase().includes(term.toLowerCase())) {
          skills.push(term);
        }
      });
    }

    const { first_name, last_name } = splitName(name);

    const profile: ParsedProfile = {
      platform: 'linkedin',
      name,
      first_name,
      last_name,
      current_position: headline,
      location,
      skills: skills.slice(0, 15),
      about,
      profile_url: url,
      linkedin_url: url,
    };

    // Validate we got meaningful data
    if (name === 'Unknown' && !headline) {
      return {
        success: false,
        error: 'Could not parse LinkedIn profile. The profile might be private or LinkedIn is blocking the request. Try using GitHub or DOU instead.',
      };
    }

    return {
      success: true,
      profile,
    };
  } catch (error) {
    console.error('Error parsing LinkedIn profile:', error);
    return {
      success: false,
      error: 'Failed to parse LinkedIn profile. LinkedIn has strict anti-scraping measures. Consider using GitHub or DOU profiles instead.',
    };
  }
}
