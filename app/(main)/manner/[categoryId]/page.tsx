'use client';

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { mannerCategories, getMannerTipsByCategoryId } from '@/lib/mock-data';

export default function MannerCategoryPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = use(params);
  const router = useRouter();
  
  const category = mannerCategories.find(c => c.id === categoryId);
  const tips = getMannerTipsByCategoryId(categoryId);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">카테고리를 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero */}
      <div className="relative h-48">
        <Image
          src={category.image_url}
          alt={category.name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <header className="absolute top-0 left-0 right-0 pt-[env(safe-area-inset-top)] px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white/20 backdrop-blur-sm rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        </header>

        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white mb-1">
            {category.name}
          </h1>
          <p className="text-white/80 text-sm">
            {category.description}
          </p>
        </div>
      </div>

      {/* Tips List */}
      <div className="px-5 py-6">
        {tips.length > 0 ? (
          <div className="space-y-4">
            {tips.map((tip) => (
              <Link
                key={tip.id}
                href={`/manner/tip/${tip.id}`}
                className="block p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {tip.image_url && (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={tip.image_url}
                        alt={tip.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[var(--text-main)] mb-2">
                      {tip.title}
                    </h3>
                    <p className="text-sm text-[var(--text-sub)] line-clamp-2">
                      {tip.description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--muted)] self-center flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[var(--muted)]">아직 매너 팁이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
