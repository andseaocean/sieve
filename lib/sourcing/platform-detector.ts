export type Platform = 'linkedin' | 'dou' | 'djinni' | 'workua' | 'github';

export interface PlatformInfo {
  platform: Platform;
  name: string;
  icon: string;
  color: string;
}

export const platformInfo: Record<Platform, PlatformInfo> = {
  linkedin: {
    platform: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  dou: {
    platform: 'dou',
    name: 'DOU',
    icon: '🇺🇦',
    color: 'bg-green-100 text-green-800 border-green-300',
  },
  djinni: {
    platform: 'djinni',
    name: 'Djinni',
    icon: '🧞',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  workua: {
    platform: 'workua',
    name: 'Work.ua',
    icon: '💼',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  github: {
    platform: 'github',
    name: 'GitHub',
    icon: '🐙',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
  },
};

export function detectPlatform(url: string): Platform | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('dou.ua') || hostname.includes('jobs.dou.ua')) return 'dou';
    if (hostname.includes('djinni.co')) return 'djinni';
    if (hostname.includes('work.ua')) return 'workua';
    if (hostname.includes('github.com')) return 'github';

    return null;
  } catch {
    return null;
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function extractUsername(url: string, platform: Platform): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    switch (platform) {
      case 'linkedin':
        // https://linkedin.com/in/username or https://www.linkedin.com/in/username/
        const linkedinMatch = pathname.match(/\/in\/([^\/]+)/);
        return linkedinMatch ? linkedinMatch[1] : null;

      case 'github':
        // https://github.com/username
        const githubMatch = pathname.match(/\/([^\/]+)\/?$/);
        // Exclude common github paths
        const excludedPaths = ['features', 'enterprise', 'pricing', 'explore', 'topics', 'collections', 'events', 'sponsors', 'trending', 'search', 'settings', 'notifications'];
        if (githubMatch && !excludedPaths.includes(githubMatch[1])) {
          return githubMatch[1];
        }
        return null;

      case 'dou':
        // https://jobs.dou.ua/users/username/
        const douMatch = pathname.match(/\/users\/([^\/]+)/);
        return douMatch ? douMatch[1] : null;

      case 'djinni':
        // https://djinni.co/q/username/ or https://djinni.co/developers/username/
        const djinniMatch = pathname.match(/\/(q|developers)\/([^\/]+)/);
        return djinniMatch ? djinniMatch[2] : null;

      case 'workua':
        // https://www.work.ua/resumes/12345/
        const workuaMatch = pathname.match(/\/resumes\/(\d+)/);
        return workuaMatch ? workuaMatch[1] : null;

      default:
        return null;
    }
  } catch {
    return null;
  }
}
