'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Plane, Utensils, Train, Landmark, ShoppingBag, Hotel } from 'lucide-react';
import { SectionHeader } from '@/components/section-header';
import { mannerCategories, mannerTips } from '@/lib/mock-data';

const iconMap: Record<string, React.ElementType> = {
  Plane,
  Utensils,
  Train,
  Landmark,
  ShoppingBag,
  Hotel,
};

export default function MannerPage() {
  return (
    <div className="pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">
          매너 가이드
        </h1>
        <p className="text-[var(--text-sub)]">
          일본 여행에서 알아두면 좋은 에티켓
        </p>
      </header>

      {/* Quick Tips Banner */}
      <div className="px-5 mb-6">
        <div className="p-5 bg-gradient-to-r from-[var(--primary-soft)] to-[var(--accent)]/30 rounded-3xl">
          <p className="text-sm font-medium text-[var(--primary)] mb-1">
            오늘의 매너 팁
          </p>
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">
            일본에서는 팁을 주지 않아요
          </h3>
          <p className="text-sm text-[var(--text-sub)]">
            일본에서 팁을 주는 것은 오히려 실례가 될 수 있어요. 좋은 서비스에 감사하고 싶다면 친절한 인사로 표현하세요.
          </p>
        </div>
      </div>

      {/* Categories */}
      <section className="px-5 mb-8">
        <SectionHeader title="카테고리" subtitle="상황별 매너 가이드" />
        <div className="grid grid-cols-2 gap-3">
          {mannerCategories.map((category) => {
            const Icon = iconMap[category.icon] || Landmark;
            return (
              <Link
                key={category.id}
                href={`/manner/${category.id}`}
                className="group relative overflow-hidden rounded-2xl aspect-[4/3]"
              >
                <Image
                  src={category.image_url}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-white" />
                    <h3 className="font-semibold text-white">{category.name}</h3>
                  </div>
                  <p className="text-xs text-white/80 line-clamp-1">
                    {category.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Popular Tips */}
      <section className="px-5 mb-8">
        <SectionHeader title="인기 매너 팁" subtitle="가장 많이 본 에티켓" />
        <div className="space-y-3">
          {mannerTips.map((tip) => (
            <Link
              key={tip.id}
              href={`/manner/tip/${tip.id}`}
              className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                {tip.image_url && (
                  <Image
                    src={tip.image_url}
                    alt={tip.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0 py-1">
                <h3 className="font-semibold text-[var(--text-main)] mb-1 line-clamp-1">
                  {tip.title}
                </h3>
                <p className="text-sm text-[var(--text-sub)] line-clamp-2">
                  {tip.description}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--muted)] self-center flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* Add to Plan CTA */}
      <section className="px-5 mb-8">
        <div className="p-5 bg-gray-50 rounded-3xl text-center">
          <h3 className="font-semibold text-[var(--text-main)] mb-2">
            여행 계획에 매너 팁 추가하기
          </h3>
          <p className="text-sm text-[var(--text-sub)] mb-4">
            방문 장소에 맞는 매너 팁을 자동으로 추가해보세요
          </p>
          <Link
            href="/plan"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold hover:bg-[var(--primary)]/90 transition-colors"
          >
            계획 만들기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
