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

interface SettingItem {
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
  desc: string;
  danger?: boolean;
}

const settingGroups: { title: string; items: SettingItem[] }[] = [
  {
    title: 'アプリ設定',
    items: [
      { id: 'language', icon: Globe, label: '言語設定', href: '/settings/language', desc: '日本語' },
      { id: 'notifications', icon: Bell, label: '通知設定', href: '/settings/notifications', desc: 'オン' },
      { id: 'privacy', icon: Shield, label: 'プライバシー設定', href: '/settings/privacy', desc: '' },
    ],
  },
  {
    title: 'サポート',
    items: [
      { id: 'about', icon: Info, label: 'このアプリについて', href: '/settings/about', desc: 'v1.0.0' },
      { id: 'terms', icon: FileText, label: '利用規約', href: '/settings/terms', desc: '' },
      { id: 'review', icon: Star, label: 'アプリを評価する', href: '/settings/review', desc: '' },
    ],
  },
  {
    title: 'アカウント',
    items: [
      { id: 'delete', icon: Trash2, label: 'アカウント削除', href: '/settings/delete-account', desc: '', danger: true },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      <header className="px-5 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[var(--primary)] mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">戻る</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">設定</h1>
      </header>

      <div className="px-5 space-y-6 pb-8">
        {settingGroups.map((group) => (
          <section key={group.title}>
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 px-1">
              {group.title}
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
                    {item.label}
                  </span>
                  {item.desc && (
                    <span className="text-sm text-[var(--muted)]">{item.desc}</span>
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
