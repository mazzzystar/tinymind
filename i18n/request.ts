import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

export default getRequestConfig(async () => {
  // Get the Accept-Language header
  const acceptLanguage = headers().get('Accept-Language');

  // Parse the Accept-Language header to get the preferred language
  const browserLocale = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0] : 'en';

  // Use the browser locale if it's supported, otherwise fallback to 'en'
  const supportedLocales = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ru', 'ar', 'hi', 'it', 'nl', 'tr', 'pl', 'vi', 'th', 'id'];
  const selectedLocale = supportedLocales.includes(browserLocale) ? browserLocale : 'en';

  return {
    locale: selectedLocale,
    messages: (await import(`../messages/${selectedLocale}.json`)).default
  };
});