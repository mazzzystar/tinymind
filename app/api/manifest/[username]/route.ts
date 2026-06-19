import { NextRequest, NextResponse } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { getIconUrls } from '@/lib/githubApi';
import { BoundedCache } from '@/lib/cache';
import ar from '@/messages/ar.json';
import de from '@/messages/de.json';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import fr from '@/messages/fr.json';
import hi from '@/messages/hi.json';
import id from '@/messages/id.json';
import it from '@/messages/it.json';
import ja from '@/messages/ja.json';
import ko from '@/messages/ko.json';
import nl from '@/messages/nl.json';
import pl from '@/messages/pl.json';
import pt from '@/messages/pt.json';
import ru from '@/messages/ru.json';
import th from '@/messages/th.json';
import tr from '@/messages/tr.json';
import vi from '@/messages/vi.json';
import zh from '@/messages/zh.json';
import zhHK from '@/messages/zh-HK.json';
import zhTW from '@/messages/zh-TW.json';

const locales = [
  'en', 'zh', 'zh-HK', 'zh-TW', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'it', 'ja',
  'ko', 'nl', 'pl', 'pt', 'ru', 'th', 'tr', 'vi'
];

const translationsByLocale: Record<string, unknown> = {
  ar,
  de,
  en,
  es,
  fr,
  hi,
  id,
  it,
  ja,
  ko,
  nl,
  pl,
  pt,
  ru,
  th,
  tr,
  vi,
  zh,
  'zh-HK': zhHK,
  'zh-TW': zhTW,
};

// Bounded cache for translations (max 25 locales, 5 min TTL)
const translationsCache = new BoundedCache<unknown>(25, 5 * 60 * 1000);

// Default translations fallback
const defaultTranslations = {
  HomePage: {
    blogTitle: "'s TinyMind Blog",
    blogShortTitle: "'s Blog",
    blogDescription: "Write and sync blog in Markdown with data stored in GitHub."
  }
};

function getLocale(request: NextRequest): string {
  try {
    const negotiatorHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

    const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
    return match(languages, locales, 'en');
  } catch {
    return 'en'; // fallback to English
  }
}

async function loadTranslations(locale: string): Promise<unknown> {
  // Check cache first (BoundedCache handles TTL internally)
  const cached = translationsCache.get(locale);
  if (cached) {
    return cached;
  }

  const data = translationsByLocale[locale] ?? translationsByLocale.en ?? defaultTranslations;
  translationsCache.set(locale, data);
  return data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    
    // Validate username
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return new NextResponse(JSON.stringify({ error: 'Invalid username' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

  const lang = getLocale(request);
  const translations = await loadTranslations(lang) as { HomePage?: { blogTitle?: string; blogShortTitle?: string; blogDescription?: string } };
    
    let iconPath = '/icon.jpg'; // default fallback
    
    try {
      const { iconPath: userIconPath } = await getIconUrls(username);
      iconPath = userIconPath || '/icon.jpg';
    } catch {
      // Continue with default icon
    }

  const manifest = {
    name: `${username}${translations.HomePage?.blogTitle || "'s TinyMind Blog"}`,
    short_name: `${username}${translations.HomePage?.blogShortTitle || "'s Blog"}`,
    description: `${translations.HomePage?.blogDescription || "Write and sync blog in Markdown with data stored in GitHub."}`,
    start_url: `/${username}`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: iconPath,
        sizes: '192x192',
        type: 'image/png'
      }
    ]
  };

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    });
  } catch {
    // Return a minimal valid manifest even on error
    const fallbackManifest = {
      name: 'TinyMind Blog',
      short_name: 'TinyMind',
      description: 'Write and sync blog in Markdown with data stored in GitHub.',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#000000',
      icons: [
        {
          src: '/icon.jpg',
          sizes: '192x192',
          type: 'image/png'
        }
      ]
    };

    return new NextResponse(JSON.stringify(fallbackManifest), {
      status: 200, // Return 200 instead of 500 to avoid SEO issues
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=300, s-maxage=300', // Shorter cache for fallback
    },
  });
  }
}
