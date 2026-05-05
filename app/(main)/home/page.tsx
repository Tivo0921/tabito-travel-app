'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, BookOpen, Newspaper, Heart, ChevronRight } from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { CategoryChip } from '@/components/category-chip';
import { SectionHeader } from '@/components/section-header';
import { PackageCard } from '@/components/package-card';
import { getPackages, getMagazineArticles, getCommunityRoutes } from '@/lib/supabase/queries';
import type { Package, MagazineArticle, CommunityRoute } from '@/lib/types';

const categories = [
  { id: 'ai', label: 'AIおすすめ', icon: Sparkles },
  { id: 'manner', label: 'マナーガイド', icon: BookOpen },
  { id: 'magazine', label: 'マガジン', icon: Newspaper },
  { id: 'saved', label: '保存済み', icon: Heart },
];

export default function HomePage() {
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
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[var(--text-sub)]">こんにちは！</p>
          <Link href="/profile">
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-[var(--primary-soft)] bg-gray-100" />
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          日本旅行を、もっと深く
        </h1>
      </header>

      {/* Search */}
      <div className="px-5 mb-6">
        <SearchBar placeholder="都市、ガイド、キーワードで検索" />
      </div>

      {/* Categories */}
      <div className="px-5 mb-8">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={cat.label}
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
          title="おすすめガイド"
          subtitle="現地の先輩が厳選したコース"
          href="/explore"
        />
        <div className="space-y-4">
          {packages.slice(0, 2).map((pkg) => (
            <PackageCard key={pkg.id} package={pkg} />
          ))}
        </div>
      </section>

      {/* Magazine Section */}
      <section className="px-5 mb-8">
        <SectionHeader
          title="マガジン"
          subtitle="日本旅行のインサイト"
          href="/explore?tab=magazine"
        />
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-5 px-5">
          {magazineArticles.map((article) => (
            <Link
              key={article.id}
              href={`/magazine/${article.id}`}
              className="flex-shrink-0 w-64 group"
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
                {article.read_time}分で読める
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Community Routes */}
      <section className="px-5 mb-8">
        <SectionHeader
          title="コミュニティルート"
          subtitle="旅行者がシェアしたコース"
          href="/explore?tab=community"
        />
        <div className="space-y-3">
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
                  <span className="text-xs text-[var(--primary)]">{route.likes} いいね</span>
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
                <p className="text-sm font-medium text-[var(--primary)] mb-1">クイックマナーチェック</p>
                <h3 className="text-lg font-bold text-[var(--text-main)]">
                  日本旅行マナーガイド
                </h3>
                <p className="text-sm text-[var(--text-sub)] mt-1">
                  シーン別エチケットを事前にチェック
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
