'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, BookOpen, Newspaper, Heart, ChevronRight } from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { CategoryChip } from '@/components/category-chip';
import { SectionHeader } from '@/components/section-header';
import { PackageCard } from '@/components/package-card';
import { 
  currentUser, 
  packages, 
  magazineArticles, 
  communityRoutes 
} from '@/lib/mock-data';
import { useState } from 'react';

const categories = [
  { id: 'ai', label: 'AI 추천', icon: Sparkles },
  { id: 'manner', label: '매너 가이드', icon: BookOpen },
  { id: 'magazine', label: '매거진', icon: Newspaper },
  { id: 'saved', label: '저장됨', icon: Heart },
];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('ai');

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[var(--text-sub)]">안녕하세요, {currentUser.name}님!</p>
          <Link href="/profile">
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-[var(--primary-soft)]">
              <Image
                src={currentUser.avatar_url || '/placeholder.png'}
                alt={currentUser.name}
                fill
                className="object-cover"
              />
            </div>
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          일본 여행을, 더 깊게
        </h1>
      </header>

      {/* Search */}
      <div className="px-5 mb-6">
        <SearchBar placeholder="도시, 가이드, 키워드 검색" />
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

      {/* Featured Package */}
      <section className="px-5 mb-8">
        <SectionHeader 
          title="추천 가이드" 
          subtitle="현지 선배가 엄선한 코스"
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
          title="매거진" 
          subtitle="일본 여행 인사이트"
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
                {article.read_time}분 읽기
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Community Routes */}
      <section className="px-5 mb-8">
        <SectionHeader 
          title="커뮤니티 루트" 
          subtitle="여행자들이 공유한 코스"
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
                  <div className="relative w-5 h-5 rounded-full overflow-hidden">
                    <Image
                      src={route.author.avatar_url || '/placeholder.png'}
                      alt={route.author.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <span className="text-xs text-[var(--muted)]">{route.author.name}</span>
                  <span className="text-xs text-[var(--muted)]">•</span>
                  <span className="text-xs text-[var(--primary)]">{route.likes} 좋아요</span>
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
                <p className="text-sm font-medium text-[var(--primary)] mb-1">빠른 매너 체크</p>
                <h3 className="text-lg font-bold text-[var(--text-main)]">
                  일본 여행 매너 가이드
                </h3>
                <p className="text-sm text-[var(--text-sub)] mt-1">
                  상황별 에티켓을 미리 알아보세요
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
