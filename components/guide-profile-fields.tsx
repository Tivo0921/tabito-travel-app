'use client';

import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/provider';
import { LOCALES, LOCALE_NATIVE_NAMES, type Locale } from '@/lib/i18n/locales';

export type GuideProfileDraft = {
  name: string;
  location: string;
  bio: string;
  /** 案内できる言語。最低1つ必須（0個だと誰にも案内できないため）#42 */
  languages: string[];
};

/**
 * クリエイタープロフィールの入力欄。
 * 登録と編集で同じ項目なので、片方だけ直して非対称になるのを避けるため
 * 1か所にまとめている。#34
 */
export function GuideProfileFields({
  value,
  onChange,
  disabled = false,
}: {
  value: GuideProfileDraft;
  onChange: (next: GuideProfileDraft) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const field = 'w-full px-4 py-3 bg-white border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-60';

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
          {t('creator.register.name')}
        </label>
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder={t('creator.register.namePlaceholder')}
          disabled={disabled}
          className={field}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
          {t('creator.register.area')}
        </label>
        <input
          type="text"
          value={value.location}
          onChange={(e) => onChange({ ...value, location: e.target.value })}
          placeholder={t('creator.register.areaPlaceholder')}
          disabled={disabled}
          className={field}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
          {t('creator.register.bio')}
        </label>
        <textarea
          value={value.bio}
          onChange={(e) => onChange({ ...value, bio: e.target.value })}
          placeholder={t('creator.register.bioPlaceholder')}
          rows={3}
          disabled={disabled}
          className={`${field} resize-none`}
        />
      </div>

      {/* 案内できる言語。登録時 ['ja','ko'] 固定で選べなかった #42 */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-sub)] mb-1">
          {t('creator.register.languages')}
        </label>
        <div className="flex flex-wrap gap-2">
          {LOCALES.map((locale) => {
            const selected = value.languages.includes(locale);
            return (
              <button
                key={locale}
                type="button"
                disabled={disabled}
                onClick={() => onChange({
                  ...value,
                  // 最後の1つは外させない。0個だと誰にも案内できない状態になる
                  languages: selected
                    ? (value.languages.length > 1
                        ? value.languages.filter((l) => l !== locale)
                        : value.languages)
                    : [...value.languages, locale],
                })}
                aria-pressed={selected}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-60',
                  selected
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-white text-[var(--text-sub)] border-[var(--border)] hover:border-[var(--primary)]',
                )}
              >
                {LOCALE_NATIVE_NAMES[locale as Locale]}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--muted)] mt-1.5">{t('creator.register.languagesHint')}</p>
      </div>
    </>
  );
}
