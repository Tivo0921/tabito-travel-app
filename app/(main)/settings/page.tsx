'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Globe,
  Bell,
  Shield,
  ChevronLeft,
  Info,
  FileText,
  Star,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT, useLocale } from '@/lib/i18n/provider';
import { LOCALE_NATIVE_NAMES } from '@/lib/i18n/locales';
import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';

interface SettingItem {
  id: string;
  icon: React.ElementType;
  labelKey: TranslationKey;
  href: string;
  /** 現在値の表示。翻訳が要るものだけキー、それ以外は素の文字列。 */
  descKey?: TranslationKey;
  desc?: string;
  danger?: boolean;
}

const settingGroups: { titleKey: TranslationKey; items: SettingItem[] }[] = [
  {
    titleKey: 'settings.group.app',
    items: [
      { id: 'language', icon: Globe, labelKey: 'settings.item.language', href: '/settings/language' },
      { id: 'notifications', icon: Bell, labelKey: 'settings.item.notifications', href: '/settings/notifications', descKey: 'settings.item.notificationsOn' },
      { id: 'privacy', icon: Shield, labelKey: 'settings.item.privacy', href: '/settings/privacy' },
    ],
  },
  {
    titleKey: 'settings.group.support',
    items: [
      { id: 'about', icon: Info, labelKey: 'settings.item.about', href: '/settings/about', desc: 'v1.0.0' },
      { id: 'terms', icon: FileText, labelKey: 'settings.item.terms', href: '/settings/terms' },
      { id: 'review', icon: Star, labelKey: 'settings.item.review', href: '/settings/review' },
    ],
  },
  {
    titleKey: 'settings.group.account',
    items: [
      { id: 'delete', icon: Trash2, labelKey: 'settings.item.deleteAccount', href: '/settings/delete-account', danger: true },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();

  return (
    <div className="pt-[env(safe-area-inset-top)] lg:max-w-3xl">
      <header className="px-5 pt-6 pb-4 lg:pt-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[var(--primary)] mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{t('nav.profile')}</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)] lg:text-3xl">{t('settings.title')}</h1>
      </header>

      <div className="px-5 space-y-6 pb-8">
        {settingGroups.map((group) => (
          <section key={group.titleKey}>
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 px-1">
              {t(group.titleKey)}
            </p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {group.items.map((item, index) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors',
                    index !== group.items.length - 1 && 'border-b border-[var(--border)]'
                  )}
                >
                  <item.icon
                    className={cn(
                      'w-5 h-5',
                      item.danger ? 'text-red-400' : 'text-[var(--muted)]'
                    )}
                  />
                  <span
                    className={cn(
                      'flex-1 text-sm',
                      item.danger ? 'text-red-500' : 'text-[var(--text-main)]'
                    )}
                  >
                    {t(item.labelKey)}
                  </span>
                  {(item.descKey || item.desc || item.id === 'language') && (
                    <span className="text-sm text-[var(--muted)]">
                      {item.id === 'language'
                        ? LOCALE_NATIVE_NAMES[locale]
                        : item.descKey
                          ? t(item.descKey)
                          : item.desc}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
