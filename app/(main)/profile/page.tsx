'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ChevronRight, 
  Heart, 
  Clock, 
  Settings, 
  HelpCircle, 
  LogOut,
  Globe,
  Bell,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/section-header';
import { PackageCard } from '@/components/package-card';
import { currentUser, packages } from '@/lib/mock-data';

type TabType = 'saved' | 'recent';

const menuItems = [
  { id: 'language', icon: Globe, label: '언어 設定', href: '/settings/language' },
  { id: 'notifications', icon: Bell, label: '알림 設定', href: '/settings/notifications' },
  { id: 'privacy', icon: Shield, label: '개인정보 設定', href: '/settings/privacy' },
  { id: 'help', icon: HelpCircle, label: 'ヘルプ', href: '/help' },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>('saved');
  
  // Mock saved items
  const savedPackages = packages.slice(0, 2);
  const recentPackages = packages.slice(1, 3);

  const handleLogout = () => {
    // TODO: Implement logout with Supabase Auth
    console.log('Logout');
  };

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
            <div className="relative w-16 h-16 rounded-full overflow-hidden ring-4 ring-white">
              <Image
                src={currentUser.avatar_url || '/placeholder.png'}
                alt={currentUser.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[var(--text-main)]">
                {currentUser.name}
              </h2>
              <p className="text-sm text-[var(--text-sub)]">
                {currentUser.email}
              </p>
            </div>
            <Link 
              href="/profile/edit"
              className="px-4 py-2 bg-white rounded-xl text-sm font-medium text-[var(--primary)] hover:bg-gray-50 transition-colors"
            >
              編集
            </Link>
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
                <p className="text-[var(--muted)]">保存した項目이 없습니다</p>
                <p className="text-sm text-[var(--text-sub)]">
                  気に入ったガイドを保存してみてください
                </p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'recent' && (
          <div className="space-y-3">
            {recentPackages.length > 0 ? (
              recentPackages.map((pkg) => (
                <PackageCard key={pkg.id} package={pkg} variant="compact" />
              ))
            ) : (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
                <p className="text-[var(--muted)]">最近見た 항목이 없습니다</p>
              </div>
            )}
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
      <section className="px-5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 bg-gray-50 rounded-2xl text-[var(--text-sub)] hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          ログアウト
        </button>
      </section>

      {/* App Version */}
      <p className="text-center text-xs text-[var(--muted)] mt-6">
        TABITO v1.0.0
      </p>
    </div>
  );
}
