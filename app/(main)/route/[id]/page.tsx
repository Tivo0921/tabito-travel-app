'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, User, MapPin } from 'lucide-react';
import { getCommunityRouteById } from '@/lib/supabase/queries';
import type { CommunityRoute } from '@/lib/types';
import { useT } from '@/lib/i18n/provider';

export default function CommunityRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const { id } = use(params);
  const router = useRouter();
  const [route, setRoute] = useState<CommunityRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCommunityRouteById(id).then((data) => {
      setRoute(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">{t('common.loading')}</p>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--muted)]">{t('route.notFound')}</p>
        <button
          onClick={() => router.push('/home')}
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold"
        >
          {t('common.goHome')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-12">
      {/* Hero */}
      <div className="relative h-72">
        {route.image_url && (
          <Image src={route.image_url} alt={route.title} fill className="object-cover" priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-4 p-2 bg-white/20 backdrop-blur-sm rounded-full"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="bg-white rounded-t-3xl px-5 pt-6 pb-8">
          {/* Meta */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center">
                {route.author.avatar_url ? (
                  <Image src={route.author.avatar_url} alt={route.author.name} width={32} height={32} className="rounded-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-[var(--primary)]" />
                )}
              </div>
              <span className="text-sm text-[var(--text-sub)]">{route.author.name}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-[var(--primary)]">
              <Heart className="w-4 h-4 fill-[var(--primary)]" />
              <span className="font-semibold">{route.likes}</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-[var(--text-main)] mb-3 text-pretty">
            {route.title}
          </h1>

          <p className="text-[var(--text-sub)] leading-relaxed mb-8">
            {route.description}
          </p>

          {/* Coming soon placeholder */}
          <div className="p-5 bg-[var(--primary-soft)]/30 rounded-2xl flex flex-col items-center gap-3 text-center">
            <MapPin className="w-8 h-8 text-[var(--primary)]" />
            <p className="font-semibold text-[var(--text-main)]">{t('route.comingSoon')}</p>
            <p className="text-sm text-[var(--text-sub)]">
              {t('route.comingSoonDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
