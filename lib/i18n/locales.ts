/**
 * アプリUIの表示言語。
 * 投稿コンテンツ（ガイド・記事など）の言語はこれとは別で、投稿時の言語のまま表示する。
 */
export const LOCALES = ['ja', 'en', 'ko'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ja';

/** 言語名は常にその言語自身で表記する（読めない言語で書かれていると選べないため） */
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
};

/** サーバー側で初期値を読むためのCookie名。localStorageだとSSRとの不一致が起きる。 */
export const LOCALE_COOKIE = 'tabito-locale';

/** 1年 */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
