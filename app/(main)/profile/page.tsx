'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Heart,
  Clock,
  Settings,
  HelpCircle,
  LogOut,
  Globe,
  Bell,
  Shield,
  LogIn,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/section-header';
import { PackageCard } from '@/components/package-card';
import { getSavedPackages } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/client';
import type { Package } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

type TabType = 'saved' | 'recent';

const menuItems = [
  { id: 'creator', icon: Video, label: 'ガイド・クリエイター管理', href: '/creator' },
  { id: 'language', icon: Globe, label: '言語設定', href: '/settings/language' },
  { id: 'notifications', icon: Bell, label: '通知設定', href: '/settings/notifications' },
  { id: 'privacy', icon: Shield, label: 'プライバシー設定', href: '/settings/privacy' },
  { id: 'help', icon: HelpCircle, label: 'ヘルプ', href: '/help' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('saved');
  const [savedPackages, setSavedPackages] = useState<Package[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        getSavedPackages().then(setSavedPackages);
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'ゲストユーザー';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="pt-[env(safe-area-inset-top)] pb-8">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            プロフィール
          </h1>
          <Link href="/settings" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Settings className="w-5 h-5 text-[var(--text-sub)]" />
          </Link>
        </div>

        {/* Profile Card */}
        <div className="p-5 bg-gradient-to-r from-[var(--primary-soft)] to-[var(--accent)]/30 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden ring-4 ring-white bg-gray-200 flex-shrink-0">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-[var(--text-main)] truncate">
                {displayName}
              </h2>
              <p className="text-sm text-[var(--text-sub)] truncate">
                {user?.email ?? 'ログインしてください'}
              </p>
            </div>
            {user && (
              <Link
                href="/profile/edit"
                className="px-4 py-2 bg-white rounded-xl text-sm font-medium text-[var(--primary)] hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                編集
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--primary)]">3</p>
              <p className="text-xs text-[var(--text-sub)]">完了したガイド</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--primary)]">12</p>
              <p className="text-xs text-[var(--text-sub)]">訪問した場所</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--primary)]">5</p>
              <p className="text-xs text-[var(--text-sub)]">保存した項目</p>
            </div>
          </div>
        </div>
      </header>

      {/* Login CTA (guest only) */}
      {!user && (
        <div className="px-5 mb-6">
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold hover:bg-[var(--primary)]/90 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            ログインして機能をフル活用
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="px-5 mb-6">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl">
          <button
            onClick={() => setActiveTab('saved')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition-all',
              activeTab === 'saved'
                ? 'bg-white text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-sub)]'
            )}
          >
            <Heart className="w-4 h-4" />
            保存済み
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition-all',
              activeTab === 'recent'
                ? 'bg-white text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-sub)]'
            )}
          >
            <Clock className="w-4 h-4" />
            最近見た
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <section className="px-5 mb-8">
        {activeTab === 'saved' && (
          <div className="space-y-3">
            {savedPackages.length > 0 ? (
              savedPackages.map((pkg) => (
                <PackageCard key={pkg.id} package={pkg} variant="compact" />
              ))
            ) : (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
                <p className="text-[var(--muted)]">保存した項目がありません</p>
                <p className="text-sm text-[var(--text-sub)]">
                  気に入ったガイドを保存してみてください
                </p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'recent' && (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
            <p className="text-[var(--muted)]">最近見た項目がありません</p>
          </div>
        )}
      </section>

      {/* Menu */}
      <section className="px-5 mb-8">
        <SectionHeader title="設定" />
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {menuItems.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors',
                index !== menuItems.length - 1 && 'border-b border-[var(--border)]'
              )}
            >
              <item.icon className="w-5 h-5 text-[var(--muted)]" />
              <span className="flex-1 text-[var(--text-main)]">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-[var(--muted)]" />
            </Link>
          ))}
        </div>
      </section>

      {/* Logout */}
      {user && (
        <section className="px-5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gray-50 rounded-2xl text-[var(--text-sub)] hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            ログアウト
          </button>
        </section>
      )}

      {/* App Version */}
      <p className="text-center text-xs text-[var(--muted)] mt-6">
        TABITO v1.0.0
      </p>
    </div>
  );
}
