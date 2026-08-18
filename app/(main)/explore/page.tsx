'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Filter, MapPin, Clock, BookOpen, Heart, User, ChevronRight } from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { CategoryChip } from '@/components/category-chip';
import { PackageCard } from '@/components/package-card';
import { getPackages, getMagazineArticles, getCommunityRoutes, getAreas, getCategories } from '@/lib/supabase/queries';
import type { Package, MagazineArticle, CommunityRoute } from '@/lib/types';
import { useT } from '@/lib/i18n/provider';

type TabType = 'packages' | 'magazine' | 'community';
type Filter = { id: string; label: string };

// label は「すべて」の訳語を描画時に差し込むため空にしておく。
// エリア／カテゴリ名はDB由来（投稿された言語のまま）なので翻訳しない。
const ALL_FILTER: Filter = { id: 'all', label: '' };

function ExploreInner() {
  const t = useT();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') === 'magazine'
    ? 'magazine'
    : searchParams.get('tab') === 'community'
      ? 'community'
      : 'packages') as TabType;

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [magazineArticles, setMagazineArticles] = useState<MagazineArticle[]>([]);
  const [communityRoutes, setCommunityRoutes] = useState<CommunityRoute[]>([]);
  const [areas, setAreas] = useState<Filter[]>([ALL_FILTER]);
  const [categoryFilters, setCategoryFilters] = useState<Filter[]>([ALL_FILTER]);
  const [activeArea, setActiveArea] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getPackages().then(setAllPackages);
    getMagazineArticles().then(setMagazineArticles);
    getCommunityRoutes().then(setCommunityRoutes);
    getAreas().then((data) =>
      setAreas([ALL_FILTER, ...data.map((a) => ({ id: a.name, label: a.name }))]),
    );
    getCategories().then((data) =>
      setCategoryFilters([ALL_FILTER, ...data.map((c) => ({ id: c.name, label: c.name }))]),
    );
  }, []);

  const filteredPackages = allPackages.filter((pkg) => {
    const matchesArea = activeArea === 'all' || pkg.area === activeArea;
    const matchesCategory = activeCategory === 'all' || pkg.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArea && matchesCategory && matchesSearch;
  });

  const tabs = [
    { id: 'packages' as TabType, label: t('explore.tab.packages') },
    { id: 'magazine' as TabType, label: t('explore.tab.magazine') },
    { id: 'community' as TabType, label: t('explore.tab.community') },
  ];

  /** 「すべて」だけUI文言、それ以外はDBの名称をそのまま出す */
  const filterLabel = (f: Filter) => (f.id === 'all' ? t('explore.filter.all') : f.label);

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      <header className="px-5 pt-6 pb-4 lg:pt-10">
        <h1 className="text-2xl font-bold text-[var(--text-main)] mb-4 lg:text-3xl">
          {t('explore.title')}
        </h1>
        <SearchBar
          placeholder={t('explore.searchPlaceholder')}
          onSearch={setSearchQuery}
          className="lg:max-w-2xl"
        />
      </header>

      {/* Tabs */}
      <div className="px-5 mb-4">
        {/* PCでは横いっぱいに伸ばさず、押しやすい幅で止める */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl lg:max-w-md">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[var(--text-main)] shadow-sm'
                  : 'text-[var(--text-sub)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <>
          <div className="px-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-[var(--primary)]" />
              <span className="text-sm font-medium text-[var(--text-main)]">
                {t('explore.filter.area')}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 lg:flex-wrap lg:overflow-visible">
              {areas.map((area) => (
                <CategoryChip
                  key={area.id}
                  label={filterLabel(area)}
                  isActive={activeArea === area.id}
                  onClick={() => setActiveArea(area.id)}
                />
              ))}
            </div>
          </div>

          <div className="px-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-[var(--primary)]" />
              <span className="text-sm font-medium text-[var(--text-main)]">
                {t('explore.filter.category')}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 lg:flex-wrap lg:overflow-visible">
              {categoryFilters.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  label={filterLabel(cat)}
                  isActive={activeCategory === cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                />
              ))}
            </div>
          </div>

          <div className="px-5 mb-4">
            <p className="text-sm text-[var(--text-sub)]">
              {t('explore.count.packages', { count: filteredPackages.length })}
            </p>
          </div>

          <div className="px-5 pb-8 space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 2xl:grid-cols-3">
            {filteredPackages.map((pkg) => (
              <PackageCard key={pkg.id} package={pkg} variant="compact" />
            ))}
            {filteredPackages.length === 0 && allPackages.length > 0 && (
              <div className="text-center py-12 lg:col-span-full">
                <p className="text-[var(--muted)] mb-2">{t('explore.empty.title')}</p>
                <p className="text-sm text-[var(--text-sub)]">{t('explore.empty.desc')}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Magazine Tab */}
      {activeTab === 'magazine' && (
        <div className="px-5 pb-8">
          <p className="text-sm text-[var(--text-sub)] mb-4">
            {t('explore.count.articles', { count: magazineArticles.length })}
          </p>
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 2xl:grid-cols-3">
            {magazineArticles.map((article) => (
              <Link key={article.id} href={`/magazine/${article.id}`} className="block group">
                <div className="flex gap-4 p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    {article.image_url && (
                      <Image
                        src={article.image_url}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <span className="text-xs font-medium text-[var(--primary)] mb-1 block">
                      {article.category}
                    </span>
                    <h3 className="font-semibold text-[var(--text-main)] text-sm line-clamp-2 mb-2 group-hover:text-[var(--primary)] transition-colors">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      <Clock className="w-3 h-3" />
                      {t('common.readTime', { count: article.read_time })}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--muted)] self-center flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Community Tab */}
      {activeTab === 'community' && (
        <div className="px-5 pb-8">
          <p className="text-sm text-[var(--text-sub)] mb-4">
            {t('explore.count.routes', { count: communityRoutes.length })}
          </p>
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 2xl:grid-cols-3">
            {communityRoutes.map((route) => (
              <Link key={route.id} href={`/route/${route.id}`} className="block group">
                <div className="flex gap-4 p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    {route.image_url && (
                      <Image
                        src={route.image_url}
                        alt={route.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-semibold text-[var(--text-main)] text-sm line-clamp-2 mb-1 group-hover:text-[var(--primary)] transition-colors">
                      {route.title}
                    </h3>
                    <p className="text-xs text-[var(--text-sub)] line-clamp-2 mb-2">
                      {route.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {route.author.name}
                      </span>
                      <span className="flex items-center gap-1 text-[var(--primary)]">
                        <Heart className="w-3 h-3 fill-[var(--primary)]" />
                        {route.likes}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--muted)] self-center flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreInner />
    </Suspense>
  );
}
