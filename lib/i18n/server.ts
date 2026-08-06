import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './locales';

/** サーバーコンポーネントから現在のUI言語を読む。Cookieが無ければ日本語。 */
export async function getLocaleFromCookie(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
