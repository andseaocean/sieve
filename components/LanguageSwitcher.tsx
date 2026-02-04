'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n';
import { getLanguageFlag } from '@/lib/translation';

const languageNames: Record<string, string> = {
  uk: 'UA',
  en: 'EN',
  tr: 'TR',
  es: 'ES',
};

export function LanguageSwitcher() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentLocale = (params.locale as string) || 'en';

  const switchLanguage = (newLocale: string) => {
    // Remove current locale from pathname and add new one
    let newPathname = pathname;

    // Check if pathname starts with a locale
    const localePattern = new RegExp(`^/(${locales.join('|')})`);
    if (localePattern.test(pathname)) {
      newPathname = pathname.replace(localePattern, `/${newLocale}`);
    } else {
      // No locale in path, add the new one
      newPathname = `/${newLocale}${pathname}`;
    }

    router.push(newPathname);
  };

  return (
    <div className="flex items-center gap-1">
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLanguage(locale)}
          className={`px-2 py-1 rounded text-sm transition-colors ${
            currentLocale === locale
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={languageNames[locale]}
        >
          <span className="mr-1">{getLanguageFlag(locale)}</span>
          <span className="font-medium">{languageNames[locale]}</span>
        </button>
      ))}
    </div>
  );
}
