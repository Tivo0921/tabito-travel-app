'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useT, useLocale } from '@/lib/i18n/provider';
import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';
import { formatDate } from '@/lib/i18n/format';

const LAST_UPDATED = '2026-07-20';

const SECTIONS: { titleKey: TranslationKey; bodyKeys: TranslationKey[] }[] = [
  { titleKey: 'policy.s1.title', bodyKeys: ['policy.s1.p1', 'policy.s1.p2', 'policy.s1.p3'] },
  { titleKey: 'policy.s2.title', bodyKeys: ['policy.s2.p1', 'policy.s2.p2', 'policy.s2.p3'] },
  { titleKey: 'policy.s3.title', bodyKeys: ['policy.s3.p1', 'policy.s3.p2'] },
  { titleKey: 'policy.s4.title', bodyKeys: ['policy.s4.p1', 'policy.s4.p2'] },
  { titleKey: 'policy.s5.title', bodyKeys: ['policy.s5.p1'] },
];

export default function PrivacyPolicyPage() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      <header className="px-5 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[var(--primary)] mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{t('privacy.title')}</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{t('privacy.policy')}</h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">{t('legal.lastUpdated', { date: formatDate(LAST_UPDATED, locale) })}</p>
      </header>

      <div className="px-5 pb-10">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-6">
          {SECTIONS.map((section) => (
            <section key={section.titleKey}>
              <h2 className="text-sm font-bold text-[var(--text-main)] mb-2">{t(section.titleKey)}</h2>
              <div className="space-y-2">
                {section.bodyKeys.map((bodyKey) => (
                  <p key={bodyKey} className="text-sm text-[var(--text-sub)] leading-relaxed">
                    {t(bodyKey)}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-xs text-[var(--muted)] leading-relaxed mt-4 px-1">
          {t('legal.draftNote')}
          <br />
          {t('legal.authoritative')}
        </p>
      </div>
    </div>
  );
}
