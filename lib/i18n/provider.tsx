'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from './locales';
import { ja, type TranslationKey } from './dictionaries/ja';
import { en } from './dictionaries/en';
import { ko } from './dictionaries/ko';

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { ja, en, ko };

type TranslateVars = Record<string, string | number>;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: TranslateVars) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * 初期値はサーバーがCookieから読んで渡す。
 * クライアント側でlocalStorageを読んで後から差し替えるとSSRと不一致になるため、この形にしている。
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    // <html lang> も追随させる（スクリーンリーダーの読み上げ言語に効く）
    document.documentElement.lang = next;
    // サーバーで描画している部分（テストモードバナー、タブタイトル等）は
    // Provider の外側にあり state 更新では変わらない。再取得して追随させる。
    router.refresh();
  }, [router]);

  const t = useCallback(
    (key: TranslationKey, vars?: TranslateVars) => {
      const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];

      // 単数形。英語で「1 reviews」にならないよう、count が 1 のときは
      // `<key>_one` があればそちらを使う。日本語・韓国語は単複を区別しないので
      // 同じ文言を入れてある（型の網羅性を保つため）。
      let lookupKey = key;
      if (typeof vars?.count === 'number') {
        const category = new Intl.PluralRules(locale).select(vars.count);
        const candidate = `${key}_${category}` as TranslationKey;
        if (candidate in dict) lookupKey = candidate;
      }

      // 未翻訳のキーは日本語にフォールバックする（空文字を出さない）
      const template = dict[lookupKey] ?? DICTIONARIES[DEFAULT_LOCALE][lookupKey] ?? key;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match
      );
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale は LocaleProvider の内側で使ってください');
  }
  return ctx;
}

/** 文言を引くだけならこちら */
export function useT() {
  return useLocale().t;
}
