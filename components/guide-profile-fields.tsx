'use client';

import { useT } from '@/lib/i18n/provider';

export type GuideProfileDraft = {
  name: string;
  location: string;
  bio: string;
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
    </>
  );
}
