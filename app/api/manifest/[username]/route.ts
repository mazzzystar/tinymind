import { NextRequest, NextResponse } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import fs from 'fs';
import path from 'path';
import { getIconUrls } from '@/lib/githubApi';

const locales = [
  'en', 'zh', 'zh-HK', 'zh-TW', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'it', 'ja', 
  'ko', 'nl', 'pl', 'pt', 'ru', 'th', 'tr', 'vi'
];

function getLocale(request: NextRequest): string {
  try {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  return match(languages, locales, 'en');
  } catch (error) {
    console.error('Error determining locale:', error);
    return 'en'; // fallback to English
  }
}

function loadTranslations(locale: string) {
  try {
  const filePath = path.join(process.cwd(), 'messages', `${locale}.json`);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error loading translations for locale ${locale}:`, error);
    // Fallback to English translations
    try {
      const fallbackPath = path.join(process.cwd(), 'messages', 'en.json');
      const fallbackContent = fs.readFileSync(fallbackPath, 'utf8');
      return JSON.parse(fallbackContent);
    } catch (fallbackError) {
      console.error('Error loading fallback translations:', fallbackError);
      // Return minimal default translations
      return {
        HomePage: {
          blogTitle: "'s TinyMind Blog",
          blogShortTitle: "'s Blog",
          blogDescription: "Write and sync blog in Markdown with data stored in GitHub."
        }
      };
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
  const username = params.username;
    
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
  const translations = loadTranslations(lang);
    
    let iconPath = '/icon.jpg'; // default fallback
    
    try {
      const { iconPath: userIconPath } = await getIconUrls(username);
      iconPath = userIconPath || '/icon.jpg';
    } catch (iconError) {
      console.error(`Error getting icon for user ${username}:`, iconError);
      // Continue with default icon
    }

  const manifest = {
    name: `${username}${translations.HomePage.blogTitle || "'s TinyMind Blog"}`,
    short_name: `${username}${translations.HomePage.blogShortTitle || "'s Blog"}`,
      description: `${translations.HomePage.blogDescription || "Write and sync blog in Markdown with data stored in GitHub."}`,
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
  } catch (error) {
    console.error('Error generating manifest:', error);
    
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