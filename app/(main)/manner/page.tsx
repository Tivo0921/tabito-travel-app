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
          マナーガイド
        </h1>
        <p className="text-[var(--text-sub)]">
          日本旅行で知っておきたいエチケット
        </p>
      </header>

      {/* Quick Tips Banner */}
      <div className="px-5 mb-6">
        <div className="p-5 bg-gradient-to-r from-[var(--primary-soft)] to-[var(--accent)]/30 rounded-3xl">
          <p className="text-sm font-medium text-[var(--primary)] mb-1">
            今日のマナーtips
          </p>
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">
            日本ではチップを渡しません
          </h3>
          <p className="text-sm text-[var(--text-sub)]">
            日本でチップを渡すことは、むしろ失礼になることがあります。良いサービスに感謝したい場合は、丁寧な挨拶で表現しましょう。
          </p>
        </div>
      </div>

      {/* Categories */}
      <section className="px-5 mb-8">
        <SectionHeader title="カテゴリ" subtitle="상황별 マナーガイド" />
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
        <SectionHeader title="人気マナーtips" subtitle="最も見られたエチケット" />
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
            旅行計画にマナーtipsを追加
          </h3>
          <p className="text-sm text-[var(--text-sub)] mb-4">
            訪問先に合ったマナーtipsを自動で追加してみましょう
          </p>
          <Link
            href="/plan"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold hover:bg-[var(--primary)]/90 transition-colors"
          >
            計画を作成
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
