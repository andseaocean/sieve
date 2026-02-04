import { ParsedProfile, ParserResult } from './types';

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

export async function parseDjinni(url: string): Promise<ParserResult> {
  try {
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
        error: `Failed to fetch Djinni profile: ${response.status}`,
      };
    }

    const html = await response.text();

    // Extract name - Djinni usually shows name in profile header
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                      html.match(/class="[^"]*profile-name[^"]*"[^>]*>([^<]+)</i);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

    // Extract position/title
    const positionMatch = html.match(/<div[^>]*class="[^"]*profile-title[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                          html.match(/position[^>]*>([^<]+)</i);
    const position = positionMatch ? positionMatch[1].trim() : undefined;

    // Extract location
    const locationMatch = html.match(/Місто:[\s]*([^<,\n]+)/i) ||
                          html.match(/location[^>]*>([^<]+)</i) ||
                          html.match(/Україна,\s*([^<,\n]+)/i);
    const location = locationMatch ? locationMatch[1].trim() : undefined;

    // Extract skills
    const skills: string[] = [];

    // Try to find skills in various formats
    const skillPatterns = [
      /<span[^>]*class="[^"]*badge[^"]*"[^>]*>([^<]+)<\/span>/gi,
      /<a[^>]*class="[^"]*skill[^"]*"[^>]*>([^<]+)<\/a>/gi,
      /class="[^"]*tag[^"]*"[^>]*>([^<]+)</gi,
    ];

    for (const pattern of skillPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        const skill = match[1].trim();
        if (skill && skill.length < 30 && !skills.includes(skill)) {
          skills.push(skill);
        }
      }
    }

    // Extract experience
    const expMatch = html.match(/(\d+)\+?\s*(років|роки|рік|years?)\s*(досвіду|experience)?/i);
    const experienceYears = expMatch ? parseInt(expMatch[1]) : undefined;

    // Extract English level
    const englishMatch = html.match(/English:?\s*([\w\s]+)/i) ||
                         html.match(/Англійська:?\s*([\w\s]+)/i);
    const englishLevel = englishMatch ? englishMatch[1].trim() : undefined;

    // Extract about/bio
    const aboutMatch = html.match(/<div[^>]*class="[^"]*profile-about[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                       html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    let about = aboutMatch ? aboutMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;
    if (about && about.length > 500) {
      about = about.substring(0, 500) + '...';
    }

    // Add English level to about if found
    if (englishLevel && about) {
      about = `English: ${englishLevel}\n\n${about}`;
    } else if (englishLevel) {
      about = `English: ${englishLevel}`;
    }

    const { first_name, last_name } = splitName(name);

    const profile: ParsedProfile = {
      platform: 'djinni',
      name,
      first_name,
      last_name,
      current_position: position,
      location,
      skills: skills.slice(0, 15),
      experience_years: experienceYears,
      about,
      profile_url: url,
    };

    if (name === 'Unknown' && skills.length === 0) {
      return {
        success: false,
        error: 'Could not parse profile data. The profile might be private or requires authentication.',
      };
    }

    return {
      success: true,
      profile,
    };
  } catch (error) {
    console.error('Error parsing Djinni profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse Djinni profile',
    };
  }
}
