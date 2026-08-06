'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Check } from 'lucide-react';
import { LOCALES, LOCALE_NATIVE_NAMES, type Locale } from '@/lib/i18n/locales';
import { useLocale, useT } from '@/lib/i18n/provider';

/** 選択肢のサブラベル。現在のUI言語で「何語か」を示す。 */
const LABEL_KEYS: Record<Locale, Record<Locale, string>> = {
  ja: { ja: '日本語', en: '英語', ko: '韓国語' },
  en: { ja: 'Japanese', en: 'English', ko: 'Korean' },
  ko: { ja: '일본어', en: '영어', ko: '한국어' },
};

export default function LanguageSettingsPage() {
  const router = useRouter();
  const t = useT();
  const { locale, setLocale } = useLocale();

  return (
    <div className="pt-[env(safe-area-inset-top)] lg:max-w-3xl">
      <header className="px-5 pt-6 pb-4 lg:pt-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[var(--primary)] mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{t('common.settings')}</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)] lg:text-3xl">
          {t('language.title')}
        </h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">{t('language.desc')}</p>
      </header>

      <div className="px-5 pb-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {LOCALES.map((code, index) => (
            <button
              key={code}
              onClick={() => setLocale(code)}
              aria-pressed={locale === code}
              className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors text-left ${
                index !== LOCALES.length - 1 ? 'border-b border-[var(--border)]' : ''
              }`}
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-main)]">
                  {LOCALE_NATIVE_NAMES[code]}
                </p>
                <p className="text-xs text-[var(--muted)]">{LABEL_KEYS[locale][code]}</p>
              </div>
              {locale === code && <Check className="w-5 h-5 text-[var(--primary)]" />}
            </button>
          ))}
        </div>

        <p className="text-xs text-[var(--muted)] mt-4 px-1 leading-relaxed">
          {t('language.note')}
        </p>
      </div>
    </div>
  );
}
