'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  BookOpen,
  Mail,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/provider';
import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';

type FaqCategory = 'package' | 'payment' | 'account' | 'creator' | 'manner';

const FAQS: { id: string; category: FaqCategory; qKey: TranslationKey; aKey: TranslationKey }[] = [
  { id: '1', category: 'package', qKey: 'help.q.whatIsPackage', aKey: 'help.a.whatIsPackage' },
  { id: '2', category: 'package', qKey: 'help.q.wherePurchased', aKey: 'help.a.wherePurchased' },
  { id: '3', category: 'payment', qKey: 'help.q.paymentMethods', aKey: 'help.a.paymentMethods' },
  { id: '4', category: 'payment', qKey: 'help.q.refund', aKey: 'help.a.refund' },
  { id: '5', category: 'account', qKey: 'help.q.cannotLogin', aKey: 'help.a.cannotLogin' },
  { id: '6', category: 'account', qKey: 'help.q.deleteAccount', aKey: 'help.a.deleteAccount' },
  { id: '7', category: 'creator', qKey: 'help.q.becomeCreator', aKey: 'help.a.becomeCreator' },
  { id: '8', category: 'manner', qKey: 'help.q.mannerFree', aKey: 'help.a.mannerFree' },
];

const CATEGORY_LABEL: Record<FaqCategory, TranslationKey> = {
  package: 'help.category.package',
  payment: 'help.category.payment',
  account: 'help.category.account',
  creator: 'help.category.creator',
  manner: 'help.category.manner',
};

const CATEGORY_FILTERS: (FaqCategory | 'all')[] = ['all', 'package', 'payment', 'account', 'creator', 'manner'];

export default function HelpPage() {
  const router = useRouter();
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<FaqCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 検索は表示中の言語の文言に対して行う
  const filtered = FAQS.filter((faq) => {
    const matchCat = activeCategory === 'all' || faq.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      q === '' ||
      t(faq.qKey).toLowerCase().includes(q) ||
      t(faq.aKey).toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="pt-[env(safe-area-inset-top)] lg:max-w-3xl">
      <header className="px-5 pt-6 pb-4 lg:pt-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[var(--primary)] mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{t('common.back')}</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)] lg:text-3xl">{t('help.title')}</h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">{t('help.subtitle')}</p>
      </header>

      {/* Search */}
      <div className="px-5 mb-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('help.searchPlaceholder')}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--border)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="px-5 mb-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all',
                activeCategory === cat
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-white text-[var(--text-sub)] border border-[var(--border)]'
              )}
            >
              {cat === 'all' ? t('help.category.all') : t(CATEGORY_LABEL[cat])}
            </button>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="px-5 mb-8">
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
              <p className="text-[var(--text-main)] font-medium">{t('help.empty.title')}</p>
              <p className="text-sm text-[var(--text-sub)] mt-1">{t('help.empty.desc')}</p>
            </div>
          ) : (
            filtered.map((faq) => (
              <div key={faq.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                  className="w-full flex items-start gap-3 px-4 py-4 text-left"
                >
                  <div className="flex-1">
                    <span className="inline-block text-xs font-medium text-[var(--primary)] bg-[var(--primary-soft)] px-2 py-0.5 rounded-full mb-1.5">
                      {t(CATEGORY_LABEL[faq.category])}
                    </span>
                    <p className="text-sm font-medium text-[var(--text-main)]">{t(faq.qKey)}</p>
                  </div>
                  {openId === faq.id ? (
                    <ChevronUp className="w-5 h-5 text-[var(--muted)] flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[var(--muted)] flex-shrink-0 mt-0.5" />
                  )}
                </button>
                {openId === faq.id && (
                  <div className="px-4 pb-4 border-t border-[var(--border)]">
                    <p className="text-sm text-[var(--text-sub)] mt-3 leading-relaxed">{t(faq.aKey)}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Contact support */}
      <div className="px-5 pb-8">
        <div className="p-5 bg-gradient-to-r from-[var(--primary-soft)] to-[var(--accent)]/30 rounded-3xl">
          <h3 className="font-bold text-[var(--text-main)] mb-1">{t('help.contact.title')}</h3>
          <p className="text-sm text-[var(--text-sub)] mb-4">{t('help.contact.desc')}</p>
          <div className="flex gap-3">
            <a
              href="mailto:support@tabito.site"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white rounded-2xl text-sm font-medium text-[var(--text-main)] hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-4 h-4 text-[var(--primary)]" />
              {t('help.contact.email')}
            </a>
            <a
              href="https://tabito.site/chat"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--primary)] rounded-2xl text-sm font-medium text-white hover:bg-[var(--primary)]/90 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {t('help.contact.chat')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
