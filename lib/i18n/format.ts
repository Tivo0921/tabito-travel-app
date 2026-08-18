import type { TranslationKey } from './dictionaries/ja';
import type { Locale } from './locales';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/**
 * 所要時間の表示。
 * DBには分で持ち、表示のときに言語へ合わせて整形する。
 * データ層で日本語に畳んでしまうと他言語で崩れ、
 * 逆算（parseInt）もできなくなるため、整形はここに集約する。
 *
 * 480分(8時間)以上だけ日単位。それ未満は「半日」のような曖昧な括りにせず、
 * 7時間を「半日」と呼ぶような実態とのズレを避けて時間・分で出す。
 */
export function formatDuration(minutes: number | null | undefined, t: Translate): string {
  if (!minutes) return '';
  if (minutes >= 480) return t('duration.days', { count: Math.round(minutes / 480) });
  if (minutes >= 60) {
    const hours = t('duration.hours', { count: Math.floor(minutes / 60) });
    const rest = minutes % 60;
    if (rest === 0) return hours;
    // 「7時間30分」。時・分それぞれ t() を通すので英語の単複もそのまま効く
    return t('duration.hoursMinutes', { hours, minutes: t('duration.minutes', { count: rest }) });
  }
  return t('duration.minutes', { count: minutes });
}

/** 金額。ブラウザ言語ではなく選択中の言語で桁区切りする */
export function formatPrice(price: number, locale: Locale, t: Translate): string {
  return t('common.priceYen', { price: price.toLocaleString(locale) });
}

/** 法務ページの更新日など。ISO文字列を各言語の表記に直す */
export function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}
