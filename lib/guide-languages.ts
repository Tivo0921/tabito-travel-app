import type { Locale } from '@/lib/i18n/locales';

/**
 * guides.languages（案内できる言語）を言語コード ['ja','en','ko'] にそろえる。#47
 *
 * 旧データ（シード由来の COCODOCO など）には ['日本語','英語'] のような
 * 表示名が入っている。言語コードだけを残すと、表示名の行は「英語」が
 * 落ちて ['ja'] になり、保存した瞬間に案内言語が減ってしまう。
 * そのため既知の表示名はコードに読み替えてから残す。
 *
 * - 前後の空白と大文字・小文字の違いは無視する
 * - 重複は最初の1つだけ残す（並びは元の順）
 * - 対応表に無い値は落とす。UI でも DB でも選べない値を残す理由が無い
 */
const ALIASES = new Map<string, Locale>(Object.entries({
  // 言語コード
  ja: 'ja',
  en: 'en',
  ko: 'ko',
  // 日本語の表示名（シードデータの形）
  日本語: 'ja',
  英語: 'en',
  韓国語: 'ko',
  // 各言語での自称（LOCALE_NATIVE_NAMES と同じ表記）
  english: 'en',
  한국어: 'ko',
  // 英語での呼び名
  japanese: 'ja',
  korean: 'ko',
} satisfies Record<string, Locale>));

export function normalizeGuideLanguages(values: readonly unknown[] | null | undefined): Locale[] {
  if (!Array.isArray(values)) return [];
  const result: Locale[] = [];
  for (const raw of values) {
    if (typeof raw !== 'string') continue;
    // Map で引く。素のオブジェクトだと 'constructor' などがプロトタイプから引けてしまう
    const code = ALIASES.get(raw.trim().toLowerCase());
    if (code && !result.includes(code)) result.push(code);
  }
  return result;
}

