'use client';

import { useState } from 'react';
import { Filter, MapPin } from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { CategoryChip } from '@/components/category-chip';
import { PackageCard } from '@/components/package-card';
import { packages } from '@/lib/mock-data';

const areas = [
  { id: 'all', label: '전체' },
  { id: 'tokyo', label: '도쿄' },
  { id: 'osaka', label: '오사카' },
  { id: 'kyoto', label: '교토' },
  { id: 'fukuoka', label: '후쿠오카' },
];

const categoryFilters = [
  { id: 'all', label: '전체' },
  { id: 'city', label: '도시 탐험' },
  { id: 'food', label: '맛집' },
  { id: 'culture', label: '문화' },
  { id: 'shopping', label: '쇼핑' },
];

export default function ExplorePage() {
  const [activeArea, setActiveArea] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPackages = packages.filter((pkg) => {
    const matchesArea = activeArea === 'all' || 
      pkg.area.toLowerCase().includes(activeArea === 'tokyo' ? '도쿄' : 
        activeArea === 'osaka' ? '오사카' : 
        activeArea === 'kyoto' ? '교토' : 
        activeArea === 'fukuoka' ? '후쿠오카' : '');
    
    const matchesCategory = activeCategory === 'all' ||
      pkg.category.toLowerCase().includes(
        activeCategory === 'city' ? '도시' :
        activeCategory === 'food' ? '맛집' :
        activeCategory === 'culture' ? '문화' :
        activeCategory === 'shopping' ? '쇼핑' : ''
      );
    
    const matchesSearch = searchQuery === '' ||
      pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesArea && matchesCategory && matchesSearch;
  });

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[var(--text-main)] mb-4">
          탐색
        </h1>
        <SearchBar 
          placeholder="가이드, 장소, 키워드 검색"
          onSearch={setSearchQuery}
        />
      </header>

      {/* Area Filter */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-[var(--primary)]" />
          <span className="text-sm font-medium text-[var(--text-main)]">지역</span>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {areas.map((area) => (
            <CategoryChip
              key={area.id}
              label={area.label}
              isActive={activeArea === area.id}
              onClick={() => setActiveArea(area.id)}
            />
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--primary)]" />
            <span className="text-sm font-medium text-[var(--text-main)]">카테고리</span>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {categoryFilters.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={cat.label}
              isActive={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
            />
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="px-5 mb-4">
        <p className="text-sm text-[var(--text-sub)]">
          {filteredPackages.length}개의 가이드
        </p>
      </div>

      {/* Package List */}
      <div className="px-5 pb-8">
        <div className="space-y-4">
          {filteredPackages.map((pkg) => (
            <PackageCard key={pkg.id} package={pkg} variant="compact" />
          ))}
        </div>

        {filteredPackages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--muted)] mb-2">검색 결과가 없습니다</p>
            <p className="text-sm text-[var(--text-sub)]">
              다른 검색어나 필터를 시도해보세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
