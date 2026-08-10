'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, BookOpen, Newspaper, Heart, ChevronRight } from 'lucide-react';
import { Logo } from '@/components/logo';
import { SearchBar } from '@/components/search-bar';
import { CategoryChip } from '@/components/category-chip';
import { SectionHeader } from '@/components/section-header';
import { PackageCard } from '@/components/package-card';
import { getPackages, getMagazineArticles, getCommunityRoutes } from '@/lib/supabase/queries';
import { useT } from '@/lib/i18n/provider';
import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';
import type { Package, MagazineArticle, CommunityRoute } from '@/lib/types';

const categories = [
  { id: 'ai', labelKey: 'home.category.ai', icon: Sparkles },
  { id: 'manner', labelKey: 'home.category.manner', icon: BookOpen },
  { id: 'magazine', labelKey: 'home.category.magazine', icon: Newspaper },
  { id: 'saved', labelKey: 'home.category.saved', icon: Heart },
] satisfies { id: string; labelKey: TranslationKey; icon: typeof Sparkles }[];

export default function HomePage() {
  const t = useT();
  const [activeCategory, setActiveCategory] = useState('ai');
  const [packages, setPackages] = useState<Package[]>([]);
  const [magazineArticles, setMagazineArticles] = useState<MagazineArticle[]>([]);
  const [communityRoutes, setCommunityRoutes] = useState<CommunityRoute[]>([]);

  useEffect(() => {
    getPackages().then(setPackages);
    getMagazineArticles().then(setMagazineArticles);
    getCommunityRoutes().then(setCommunityRoutes);
  }, []);

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 lg:pt-10">
        {/* サイドナビが無いモバイルのみロゴとアバターを出す */}
        <div className="flex items-center justify-between mb-3 lg:hidden">
          <Logo size="sm" priority />
          <Link href="/profile">
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-[var(--primary-soft)] bg-gray-100" />
          </Link>
        </div>
        <p className="text-[var(--text-sub)] mb-1">{t('home.greeting')}</p>
        <h1 className="text-2xl font-bold text-[var(--text-main)] lg:text-3xl">
          {t('home.title')}
        </h1>
      </header>

      {/* Search */}
      <div className="px-5 mb-6">
        <SearchBar placeholder={t('home.searchPlaceholder')} className="lg:max-w-2xl" />
      </div>

      {/* Categories */}
      <div className="px-5 mb-8">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 lg:flex-wrap lg:overflow-visible">
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={t(cat.labelKey)}
              icon={cat.icon}
              isActive={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
            />
          ))}
        </div>
      </div>

      {/* Featured Packages */}
      <section className="px-5 mb-8">
        <SectionHeader
          title={t('home.section.packages')}
          subtitle={t('home.section.packagesSub')}
          href="/explore"
          actionLabel={t('common.seeMore')}
        />
        {/* モバイルは2件の縦積み、PCは最大6件をグリッドで見せる */}
        <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-5 sm:space-y-0 xl:grid-cols-3">
          {packages.slice(0, 6).map((pkg, i) => (
            <div key={pkg.id} className={i >= 2 ? 'max-lg:hidden' : undefined}>
              <PackageCard package={pkg} />
            </div>
          ))}
        </div>
      </section>

      {/* Magazine Section */}
      <section className="px-5 mb-8">
        <SectionHeader
          title={t('home.section.magazine')}
          subtitle={t('home.section.magazineSub')}
          href="/explore?tab=magazine"
          actionLabel={t('common.seeMore')}
        />
        {/* モバイルは横スクロール、PCはグリッドに展開 */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-5 px-5 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:mx-0 lg:px-0">
          {magazineArticles.map((article) => (
            <Link
              key={article.id}
              href={`/magazine/${article.id}`}
              className="flex-shrink-0 w-64 group lg:w-auto"
            >
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3">
                <Image
                  src={article.image_url}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium">
                    {article.category}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-[var(--text-main)] mb-1 line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                {article.title}
              </h3>
              <p className="text-sm text-[var(--text-sub)]">
                {t('common.readTime', { count: article.read_time })}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Community Routes */}
      <section className="px-5 mb-8">
        <SectionHeader
          title={t('home.section.community')}
          subtitle={t('home.section.communitySub')}
          href="/explore?tab=community"
          actionLabel={t('common.seeMore')}
        />
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {communityRoutes.map((route) => (
            <Link
              key={route.id}
              href={`/route/${route.id}`}
              className="flex gap-4 p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={route.image_url}
                  alt={route.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="flex-1 min-w-0 py-1">
                <h3 className="font-semibold text-[var(--text-main)] mb-1 line-clamp-1">
                  {route.title}
                </h3>
                <p className="text-sm text-[var(--text-sub)] line-clamp-2 mb-2">
                  {route.description}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)]">{route.author.name}</span>
                  <span className="text-xs text-[var(--muted)]">•</span>
                  <span className="text-xs text-[var(--primary)]">
                    {t('home.likes', { count: route.likes })}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--muted)] self-center flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Access Manner Guide */}
      <section className="px-5 mb-8">
        <Link href="/manner" className="block">
          <div className="p-5 bg-gradient-to-r from-[var(--primary-soft)] to-[var(--accent)]/30 rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--primary)] mb-1">
                  {t('home.manner.eyebrow')}
                </p>
                <h3 className="text-lg font-bold text-[var(--text-main)]">
                  {t('home.manner.title')}
                </h3>
                <p className="text-sm text-[var(--text-sub)] mt-1">
                  {t('home.manner.desc')}
                </p>
              </div>
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <BookOpen className="w-8 h-8 text-[var(--primary)]" />
              </div>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
