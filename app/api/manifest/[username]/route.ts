import { NextRequest, NextResponse } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import fs from 'fs';
import path from 'path';

const locales = [
  'en', 'zh', 'zh-HK', 'zh-TW', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'it', 'ja', 
  'ko', 'nl', 'pl', 'pt', 'ru', 'th', 'tr', 'vi'
];

function getLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  return match(languages, locales, 'en');
}

function loadTranslations(locale: string) {
  const filePath = path.join(process.cwd(), 'messages', `${locale}.json`);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContent);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const username = params.username;
  const lang = getLocale(request);
  const translations = loadTranslations(lang);

  const manifest = {
    name: `${username}${translations.HomePage.blogTitle || "'s TinyMind Blog"}`,
    short_name: `${username}${translations.HomePage.blogShortTitle || "'s Blog"}`,
    description: `${translations.HomePage.blogDescription ||  "Write and sync blog in Markdown with data stored in GitHub."}`,
    start_url: `/${username}`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon.jpg',
        sizes: '192x192',
        type: 'image/jpeg'
      }
    ]
  };

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}