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

export async function parseWorkUA(url: string): Promise<ParserResult> {
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
        error: `Failed to fetch Work.ua profile: ${response.status}`,
      };
    }

    const html = await response.text();

    // Extract name
    const nameMatch = html.match(/<h1[^>]*class="[^"]*resume-name[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                      html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

    // Extract desired position
    const positionMatch = html.match(/<h2[^>]*class="[^"]*resume-position[^"]*"[^>]*>([^<]+)<\/h2>/i) ||
                          html.match(/Бажана посада:?\s*([^<\n]+)/i);
    const position = positionMatch ? positionMatch[1].trim() : undefined;

    // Extract location/city
    const locationMatch = html.match(/Місто:?\s*([^<,\n]+)/i) ||
                          html.match(/<dd[^>]*>([^<]*(?:Київ|Львів|Харків|Одеса|Дніпро)[^<]*)<\/dd>/i);
    const location = locationMatch ? locationMatch[1].trim() : undefined;

    // Extract experience
    const expMatch = html.match(/Досвід роботи:?\s*(\d+)\s*(років|роки|рік)/i) ||
                     html.match(/(\d+)\s*(років|роки|рік)\s*досвіду/i);
    const experienceYears = expMatch ? parseInt(expMatch[1]) : undefined;

    // Extract skills
    const skills: string[] = [];

    // Try various skill extraction patterns (all must have 'g' flag for matchAll)
    const skillPatterns = [
      /<span[^>]*class="[^"]*skill[^"]*"[^>]*>([^<]+)<\/span>/gi,
      /<li[^>]*class="[^"]*skill[^"]*"[^>]*>([^<]+)<\/li>/gi,
    ];

    for (const pattern of skillPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        const skill = match[1].replace(/<[^>]+>/g, '').trim();
        if (skill && skill.length < 50 && !skills.includes(skill)) {
          skills.push(skill);
        }
      }
    }

    // Try to extract skills from a skills section
    const skillsSectionMatch = html.match(/Ключові навички:[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
    if (skillsSectionMatch) {
      const skillItems = skillsSectionMatch[1].match(/<li[^>]*>([^<]+)<\/li>/gi);
      if (skillItems) {
        for (const item of skillItems) {
          const skill = item.replace(/<[^>]+>/g, '').trim();
          if (skill && skill.length < 50 && !skills.includes(skill)) {
            skills.push(skill);
          }
        }
      }
    }

    // Extract about/summary
    const aboutMatch = html.match(/<div[^>]*class="[^"]*resume-about[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                       html.match(/Про себе:?[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    let about = aboutMatch ? aboutMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;
    if (about && about.length > 500) {
      about = about.substring(0, 500) + '...';
    }

    // Extract email if visible
    const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const email = emailMatch ? emailMatch[1] : undefined;

    // Extract phone if visible
    const phoneMatch = html.match(/(\+?38\s?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/);
    const phone = phoneMatch ? phoneMatch[1] : undefined;

    const { first_name, last_name } = splitName(name);

    const profile: ParsedProfile = {
      platform: 'workua',
      name,
      first_name,
      last_name,
      current_position: position,
      location,
      skills: skills.slice(0, 15),
      experience_years: experienceYears,
      about,
      profile_url: url,
      email,
      raw_data: phone ? { phone } : undefined,
    };

    // Check if we got a blocked/captcha page
    if (html.includes('captcha') || html.includes('Перевірка') || html.includes('robot')) {
      return {
        success: false,
        error: 'Work.ua заблокував автоматичний запит. Будь ласка, введіть дані кандидата вручну.',
      };
    }

    if (name === 'Unknown' && !position && skills.length === 0) {
      return {
        success: false,
        error: 'Не вдалося розпарсити профіль Work.ua. Резюме може бути приховане, або сайт заблокував запит. Спробуйте ввести дані вручну.',
      };
    }

    return {
      success: true,
      profile,
    };
  } catch (error) {
    console.error('Error parsing Work.ua profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse Work.ua profile',
    };
  }
}
