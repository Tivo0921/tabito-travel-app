'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useT, useLocale } from '@/lib/i18n/provider';
import { formatDate } from '@/lib/i18n/format';
import { buildLegalNoticeRows, type NoticeValue } from '@/lib/legal/notice';

const LAST_UPDATED = '2026-11-11';

/** 特定商取引法に基づく表記 #67 */
export default function LegalNoticePage() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const rows = buildLegalNoticeRows();

  const renderValue = (value: NoticeValue) => {
    switch (value.kind) {
      case 'business':
        return value.value ?? (
          <span className="text-amber-700">{t('legalNotice.placeholder')}</span>
        );
      case 'text':
        return t(value.key);
      case 'link':
        return (
          <Link href={value.href} className="text-[var(--primary)] underline">
            {t(value.key)}
          </Link>
        );
    }
  };

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
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{t('settings.item.legal')}</h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">{t('legal.lastUpdated', { date: formatDate(LAST_UPDATED, locale) })}</p>
      </header>

      <div className="px-5 pb-10 lg:max-w-3xl">
        <dl className="bg-white rounded-2xl shadow-sm divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <div key={row.labelKey} className="p-4 lg:grid lg:grid-cols-[12rem_1fr] lg:gap-4">
              <dt className="text-xs font-bold text-[var(--text-main)] mb-1 lg:mb-0">{t(row.labelKey)}</dt>
              <dd className="text-sm text-[var(--text-sub)] leading-relaxed whitespace-pre-line break-words">
                {renderValue(row.value)}
              </dd>
            </div>
          ))}
        </dl>

        <p className="text-xs text-[var(--muted)] leading-relaxed mt-4 px-1">
          {t('legal.draftNote')}
          <br />
          {t('legal.authoritative')}
        </p>
      </div>
    </div>
  );
}
