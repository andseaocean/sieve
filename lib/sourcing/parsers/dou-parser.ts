import { ParsedProfile, ParserResult } from './types';

// DOU parser - uses web scraping approach
// Note: This is a simplified parser that works with public DOU profiles

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

export async function parseDOU(url: string): Promise<ParserResult> {
  try {
    // For DOU, we'll use a server-side fetch to get the HTML
    // Note: This may require additional handling for authentication or rate limiting

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch DOU profile: ${response.status}`,
      };
    }

    const html = await response.text();

    // Extract data using regex patterns (simplified approach)
    // In production, you might want to use a proper HTML parser like cheerio

    // Extract name
    const nameMatch = html.match(/<h1[^>]*class="[^"]*g-h2[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                      html.match(/<div[^>]*class="[^"]*user-info[^"]*"[^>]*>[\s\S]*?<h1[^>]*>([^<]+)<\/h1>/i);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

    // Extract position/title
    const positionMatch = html.match(/<div[^>]*class="[^"]*position[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                          html.match(/<span[^>]*class="[^"]*job-title[^"]*"[^>]*>([^<]+)<\/span>/i);
    const position = positionMatch ? positionMatch[1].trim() : undefined;

    // Extract location
    const locationMatch = html.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                          html.match(/Місто:[\s]*([^<,]+)/i);
    const location = locationMatch ? locationMatch[1].trim() : undefined;

    // Extract skills - look for skill tags
    const skillsMatches = html.matchAll(/<span[^>]*class="[^"]*skill[^"]*"[^>]*>([^<]+)<\/span>/gi);
    const skills: string[] = [];
    for (const match of skillsMatches) {
      const skill = match[1].trim();
      if (skill && !skills.includes(skill)) {
        skills.push(skill);
      }
    }

    // If no skills found with class, try alternative patterns
    if (skills.length === 0) {
      const techMatch = html.match(/Технології:[\s]*([^<]+)/i);
      if (techMatch) {
        const techSkills = techMatch[1].split(',').map(s => s.trim()).filter(Boolean);
        skills.push(...techSkills);
      }
    }

    // Extract experience years
    const expMatch = html.match(/(\d+)\+?\s*(років|роки|рік|years?)/i);
    const experienceYears = expMatch ? parseInt(expMatch[1]) : undefined;

    // Extract about/bio
    const aboutMatch = html.match(/<div[^>]*class="[^"]*about[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                       html.match(/<div[^>]*class="[^"]*bio[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    let about = aboutMatch ? aboutMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;
    if (about && about.length > 500) {
      about = about.substring(0, 500) + '...';
    }

    // Extract email if visible
    const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const email = emailMatch ? emailMatch[1] : undefined;

    const { first_name, last_name } = splitName(name);

    const profile: ParsedProfile = {
      platform: 'dou',
      name,
      first_name,
      last_name,
      current_position: position,
      location,
      skills: skills.slice(0, 15), // Limit to 15 skills
      experience_years: experienceYears,
      about,
      profile_url: url,
      email,
    };

    // Check if we got meaningful data
    if (name === 'Unknown' && skills.length === 0) {
      return {
        success: false,
        error: 'Could not parse profile data. The profile might be private or the page structure has changed.',
      };
    }

    return {
      success: true,
      profile,
    };
  } catch (error) {
    console.error('Error parsing DOU profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse DOU profile',
    };
  }
}
