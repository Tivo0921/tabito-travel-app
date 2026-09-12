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
import { getSavedPackages, getMyProfile } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/client';
import type { Package } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { useT } from '@/lib/i18n/provider';
import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';

type TabType = 'saved' | 'recent';

const menuItems = [
  { id: 'creator', icon: Video, labelKey: 'profile.menu.creator', href: '/creator' },
  { id: 'language', icon: Globe, labelKey: 'settings.item.language', href: '/settings/language' },
  { id: 'notifications', icon: Bell, labelKey: 'settings.item.notifications', href: '/settings/notifications' },
  { id: 'privacy', icon: Shield, labelKey: 'settings.item.privacy', href: '/settings/privacy' },
  { id: 'help', icon: HelpCircle, labelKey: 'nav.help', href: '/help' },
] satisfies { id: string; icon: typeof Video; labelKey: TranslationKey; href: string }[];

export default function ProfilePage() {
  const t = useT();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('saved');
  const [savedPackages, setSavedPackages] = useState<Package[]>([]);
  const [user, setUser] = useState<User | null>(null);
  // 表示名は profiles を読む。user_metadata は Google の値で、
  // 編集画面の保存が反映されない #31
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        getSavedPackages().then(setSavedPackages);
        getMyProfile().then((r) => {
          if (r.status === 'ok' && r.profile.display_name) setProfileName(r.profile.display_name);
        });
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  // profiles を最優先。取れないときだけ Google の値に落とす
  const displayName =
    profileName ?? user?.user_metadata?.full_name ?? user?.email ?? t('profile.guestUser');
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    // lg:max-w-4xl … PCでも間延びしないよう読みやすい幅で止める
    <div className="pt-[env(safe-area-inset-top)] pb-8 lg:max-w-4xl">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 lg:pt-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-main)] lg:text-3xl">
            {t('profile.title')}
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
                {user?.email ?? t('profile.pleaseLogin')}
              </p>
            </div>
            {user && (
              <Link
                href="/profile/edit"
                className="px-4 py-2 bg-white rounded-xl text-sm font-medium text-[var(--primary)] hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                {t('profile.edit')}
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--primary)]">3</p>
              <p className="text-xs text-[var(--text-sub)]">{t('profile.stats.completed')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--primary)]">12</p>
              <p className="text-xs text-[var(--text-sub)]">{t('profile.stats.visited')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--primary)]">5</p>
              <p className="text-xs text-[var(--text-sub)]">{t('profile.stats.saved')}</p>
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
            {t('profile.loginCta')}
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="px-5 mb-6">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl lg:max-w-md">
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
            {t('profile.tab.saved')}
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
            {t('profile.tab.recent')}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <section className="px-5 mb-8">
        {activeTab === 'saved' && (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {savedPackages.length > 0 ? (
              savedPackages.map((pkg) => (
                <PackageCard key={pkg.id} package={pkg} variant="compact" />
              ))
            ) : (
              <div className="text-center py-12 lg:col-span-2">
                <Heart className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
                <p className="text-[var(--muted)]">{t('profile.empty.saved')}</p>
                <p className="text-sm text-[var(--text-sub)]">
                  {t('profile.empty.savedDesc')}
                </p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'recent' && (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
            <p className="text-[var(--muted)]">{t('profile.empty.recent')}</p>
          </div>
        )}
      </section>

      {/* Menu */}
      <section className="px-5 mb-8">
        <SectionHeader title={t('settings.title')} />
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
              <span className="flex-1 text-[var(--text-main)]">{t(item.labelKey)}</span>
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
            {t('profile.logout')}
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
