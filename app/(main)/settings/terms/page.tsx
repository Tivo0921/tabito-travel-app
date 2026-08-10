'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useT } from '@/lib/i18n/provider';
import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';

const LAST_UPDATED = '2026-07-20';

const SECTIONS: { titleKey: TranslationKey; bodyKeys: TranslationKey[] }[] = [
  { titleKey: 'terms.s1.title', bodyKeys: ['terms.s1.p1', 'terms.s1.p2'] },
  { titleKey: 'terms.s2.title', bodyKeys: ['terms.s2.p1', 'terms.s2.p2'] },
  { titleKey: 'terms.s3.title', bodyKeys: ['terms.s3.p1', 'terms.s3.p2'] },
  { titleKey: 'terms.s4.title', bodyKeys: ['terms.s4.p1'] },
  { titleKey: 'terms.s5.title', bodyKeys: ['terms.s5.p1', 'terms.s5.p2'] },
  { titleKey: 'terms.s6.title', bodyKeys: ['terms.s6.p1'] },
];

export default function TermsPage() {
  const t = useT();
  const router = useRouter();

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      <header className="px-5 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[var(--primary)] mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{t('common.back')}</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{t('settings.item.terms')}</h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">{t('legal.lastUpdated', { date: LAST_UPDATED })}</p>
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
