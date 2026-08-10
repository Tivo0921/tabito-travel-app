'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  PartyPopper,
} from 'lucide-react';
import { cn, getYouTubeEmbedUrl } from '@/lib/utils';
import { CTAButton } from '@/components/cta-button';
import { SpotProgressItem } from '@/components/spot-progress-item';
import { JapanesePhraseCard } from '@/components/japanese-phrase-card';
import { MannerTipBox } from '@/components/manner-tip-box';
import { getPackageById, getSpotsByPackageId } from '@/lib/supabase/queries';
import { useT } from '@/lib/i18n/provider';
import type { Package, Spot } from '@/lib/types';

export default function GuideExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [currentSpotIndex, setCurrentSpotIndex] = useState(0);
  const [showAllSpots, setShowAllSpots] = useState(false);
  const [completedSpots, setCompletedSpots] = useState<Set<string>>(new Set());
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useT();

  useEffect(() => {
    Promise.all([
      getPackageById(id).then(setPkg),
      getSpotsByPackageId(id).then(setSpots),
    ]).finally(() => setLoading(false));

  }, [id]);


  const currentSpot = spots[currentSpotIndex];
  const progress = spots.length > 0 ? ((currentSpotIndex + 1) / spots.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">{t('common.loading')}</p>
      </div>
    );
  }

  if (!pkg || !currentSpot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--muted)]">{t('guide.notFound')}</p>
        <button
          onClick={() => router.push('/home')}
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold"
        >
          {t('common.goHome')}
        </button>
      </div>
    );
  }

  const handleNextSpot = () => {
    setCompletedSpots(new Set([...completedSpots, currentSpot.id]));
    if (currentSpotIndex < spots.length - 1) {
      setCurrentSpotIndex(currentSpotIndex + 1);
    } else {
      setShowCompleteModal(true);
    }
  };

  const handlePrevSpot = () => {
    if (currentSpotIndex > 0) {
      setCurrentSpotIndex(currentSpotIndex - 1);
    }
  };

  const handleSpotClick = (index: number) => {
    setCurrentSpotIndex(index);
    setShowAllSpots(false);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[var(--border)] pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push(`/package/${id}`)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-sub)] truncate">{pkg.title}</p>
            <p className="text-xs text-[var(--muted)]">
              {t('guide.spotCount', { current: currentSpotIndex + 1, total: spots.length })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--primary)]">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Current Spot */}
      <div className="px-5 py-6">
        {/* Spot Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 bg-[var(--primary)] text-white rounded-full flex items-center justify-center text-sm font-bold">
            {currentSpotIndex + 1}
          </span>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-main)]">
              {currentSpot.name}
            </h1>
            <p className="text-sm text-[var(--text-sub)]">
              {t('guide.duration', { min: currentSpot.duration_minutes ?? 0 })}
            </p>
          </div>
        </div>

        {/* Video Section */}
        <div className="rounded-2xl overflow-hidden mb-6 bg-black aspect-video">
          {getYouTubeEmbedUrl(currentSpot.video_url) ? (
            <iframe
              src={getYouTubeEmbedUrl(currentSpot.video_url)!}
              title={currentSpot.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            <div className="relative w-full h-full">
              {currentSpot.image_url && (
                <Image
                  src={currentSpot.image_url}
                  alt={currentSpot.name}
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-2">
                <Play className="w-10 h-10 text-white/60" />
                <p className="text-white/60 text-sm">{t('guide.videoPending')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="font-semibold text-[var(--text-main)] mb-2">{t('guide.description')}</h2>
          <p className="text-[var(--text-sub)] leading-relaxed">
            {currentSpot.description}
          </p>
        </div>

        {/* Local Tips */}
        <div className="mb-6">
          <h2 className="font-semibold text-[var(--text-main)] mb-3">{t('guide.localTips')}</h2>
          <div className="space-y-2">
            {currentSpot.local_tips.map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-[var(--primary-soft)]/30 rounded-xl"
              >
                <span className="w-5 h-5 bg-[var(--primary)] text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <p className="text-sm text-[var(--text-main)]">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Japanese Phrases */}
        <div className="mb-6">
          <h2 className="font-semibold text-[var(--text-main)] mb-3">{t('guide.phrases')}</h2>
          <div className="space-y-3">
            {currentSpot.japanese_phrases.map((phrase, index) => (
              <JapanesePhraseCard key={index} phrase={phrase} />
            ))}
          </div>
        </div>

        {/* Etiquette Tips */}
        <div className="mb-6">
          <MannerTipBox
            title={t('guide.mannerTitle')}
            tips={currentSpot.etiquette_tips}
            variant="info"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <a
            href={currentSpot.map_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-[var(--border)] rounded-2xl text-[var(--text-main)] font-medium hover:bg-gray-50 transition-colors"
          >
            <MapPin className="w-5 h-5 text-[var(--primary)]" />
            {t('guide.openMap')}
          </a>
          {currentSpot.shop_url && (
            <a
              href={currentSpot.shop_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-[var(--border)] rounded-2xl text-[var(--text-main)] font-medium hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-[var(--accent)]" />
              {t('guide.details')}
            </a>
          )}
        </div>

        {/* Spots List Toggle */}
        <button
          onClick={() => setShowAllSpots(!showAllSpots)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl mb-4"
        >
          <span className="font-medium text-[var(--text-main)]">
            {t('guide.showAllSpots', { count: spots.length })}
          </span>
          {showAllSpots ? (
            <ChevronUp className="w-5 h-5 text-[var(--muted)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--muted)]" />
          )}
        </button>

        {/* Spots List */}
        {showAllSpots && (
          <div className="space-y-2 mb-6">
            {spots.map((spot, index) => (
              <SpotProgressItem
                key={spot.id}
                spot={spot}
                status={
                  completedSpots.has(spot.id)
                    ? 'completed'
                    : index === currentSpotIndex
                      ? 'current'
                      : 'upcoming'
                }
                onClick={() => handleSpotClick(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-full bg-[var(--primary-soft)] flex items-center justify-center">
                <PartyPopper className="w-8 h-8 text-[var(--primary)]" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-main)]">{t('guide.completed')}</h2>
              <p className="text-sm text-[var(--text-sub)] text-center">
                {t('guide.completedDesc', { title: pkg?.title ?? '' })}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-3 border border-[var(--border)] rounded-2xl font-medium"
              >
                {t('guide.viewAgain')}
              </button>
              <button
                onClick={() => router.push(`/package/${id}`)}
                className="flex-1 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold"
              >
                {t('guide.backToPackage')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      {/* lg:pl-64 … PCではサイドナビ分を空けて本文列と揃える */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[var(--border)] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:pl-64">
        <div className="max-w-lg mx-auto flex items-center gap-3 lg:max-w-6xl lg:px-6">
          <button
            onClick={handlePrevSpot}
            disabled={currentSpotIndex === 0}
            className={cn(
              'px-6 py-3 border border-[var(--border)] rounded-2xl font-medium transition-colors',
              currentSpotIndex === 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-50'
            )}
          >
            {t('guide.prev')}
          </button>
          <CTAButton
            onClick={handleNextSpot}
            fullWidth
            className="flex-1"
          >
            {currentSpotIndex === spots.length - 1 ? (
              <>
                <Check className="w-5 h-5" />
                {t('guide.complete')}
              </>
            ) : (
              t('guide.next')
            )}
          </CTAButton>
        </div>
      </div>
    </div>
  );
}
