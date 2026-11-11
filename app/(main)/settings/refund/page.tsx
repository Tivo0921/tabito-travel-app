'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useT, useLocale } from '@/lib/i18n/provider';
import { formatDate } from '@/lib/i18n/format';
import { REFUND_SECTIONS } from '@/lib/legal/notice';

const LAST_UPDATED = '2026-11-11';

/** 返金ポリシー #67 */
export default function RefundPolicyPage() {
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
          <span className="text-sm font-medium">{t('common.back')}</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{t('settings.item.refund')}</h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">{t('legal.lastUpdated', { date: formatDate(LAST_UPDATED, locale) })}</p>
      </header>

      <div className="px-5 pb-10 lg:max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-6">
          {REFUND_SECTIONS.map((section) => (
            <section key={section.titleKey}>
              <h2 className="text-sm font-bold text-[var(--text-main)] mb-2">{t(section.titleKey)}</h2>
              {section.list ? (
                <ul className="list-disc pl-5 space-y-1">
                  {section.bodyKeys.map((bodyKey) => (
                    <li key={bodyKey} className="text-sm text-[var(--text-sub)] leading-relaxed">
                      {t(bodyKey)}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-2">
                  {section.bodyKeys.map((bodyKey) => (
                    <p key={bodyKey} className="text-sm text-[var(--text-sub)] leading-relaxed">
                      {t(bodyKey)}
                    </p>
                  ))}
                </div>
              )}
            </section>
          ))}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href="/help" className="text-[var(--primary)] underline">{t('about.helpContact')}</Link>
            <Link href="/settings/legal" className="text-[var(--primary)] underline">{t('settings.item.legal')}</Link>
          </div>
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
