import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, isLocale, type Locale } from './locales';

/**
 * サーバーコンポーネントから現在のUI言語を読む。
 *
 * 優先順位:
 *   1. Cookie（ユーザーが明示的に選んだ言語）
 *   2. Accept-Language（初回訪問時の推定。クローラーやSNSのOGP取得は
 *      Cookieを送らないため、ここが無いと常に日本語になってしまう）
 *   3. 日本語
 */
export async function resolveLocale(): Promise<Locale> {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const accept = (await headers()).get('accept-language');
  return pickFromAcceptLanguage(accept);
}

/** `ko-KR,ko;q=0.9,en;q=0.8` のような値から対応言語を選ぶ */
export function pickFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.split('=')[1]) : 1 };
    })
    .filter((x) => x.tag && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    // 'ja-JP' → 'ja' のように地域を落として照合する
    const base = tag.split('-')[0];
    const hit = LOCALES.find((l) => l === base);
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}
