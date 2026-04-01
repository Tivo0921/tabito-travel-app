'use client';

import { use, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Play, 
  MapPin, 
  ExternalLink, 
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CTAButton } from '@/components/cta-button';
import { SpotProgressItem } from '@/components/spot-progress-item';
import { JapanesePhraseCard } from '@/components/japanese-phrase-card';
import { MannerTipBox } from '@/components/manner-tip-box';
import { getPackageById, getSpotsByPackageId } from '@/lib/mock-data';

export default function GuideExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [currentSpotIndex, setCurrentSpotIndex] = useState(0);
  const [showAllSpots, setShowAllSpots] = useState(false);
  const [completedSpots, setCompletedSpots] = useState<Set<string>>(new Set());

  const pkg = getPackageById(id);
  const spots = getSpotsByPackageId(id);
  const currentSpot = spots[currentSpotIndex];
  const progress = ((currentSpotIndex + 1) / spots.length) * 100;

  if (!pkg || !currentSpot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">가이드를 찾을 수 없습니다</p>
      </div>
    );
  }

  const handleNextSpot = () => {
    setCompletedSpots(new Set([...completedSpots, currentSpot.id]));
    if (currentSpotIndex < spots.length - 1) {
      setCurrentSpotIndex(currentSpotIndex + 1);
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
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-sub)] truncate">{pkg.title}</p>
            <p className="text-xs text-[var(--muted)]">
              {currentSpotIndex + 1} / {spots.length} 장소
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
              약 {currentSpot.duration_minutes}분 소요
            </p>
          </div>
        </div>

        {/* Video Section */}
        <div className="relative aspect-video bg-gray-100 rounded-2xl overflow-hidden mb-6">
          <Image
            src={currentSpot.image_url}
            alt={currentSpot.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <button className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
              <Play className="w-6 h-6 text-[var(--primary)] ml-1" />
            </button>
          </div>
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 rounded text-xs text-white">
            가이드 영상
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="font-semibold text-[var(--text-main)] mb-2">현지 가이드 설명</h2>
          <p className="text-[var(--text-sub)] leading-relaxed">
            {currentSpot.description}
          </p>
        </div>

        {/* Local Tips */}
        <div className="mb-6">
          <h2 className="font-semibold text-[var(--text-main)] mb-3">로컬 팁</h2>
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
          <h2 className="font-semibold text-[var(--text-main)] mb-3">유용한 일본어</h2>
          <div className="space-y-3">
            {currentSpot.japanese_phrases.map((phrase, index) => (
              <JapanesePhraseCard key={index} phrase={phrase} />
            ))}
          </div>
        </div>

        {/* Etiquette Tips */}
        <div className="mb-6">
          <MannerTipBox 
            title="이 장소 매너" 
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
            지도 열기
          </a>
          {currentSpot.shop_url && (
            <a
              href={currentSpot.shop_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-[var(--border)] rounded-2xl text-[var(--text-main)] font-medium hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-[var(--accent)]" />
              상세 정보
            </a>
          )}
        </div>

        {/* Spots List Toggle */}
        <button
          onClick={() => setShowAllSpots(!showAllSpots)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl mb-4"
        >
          <span className="font-medium text-[var(--text-main)]">
            전체 장소 보기 ({spots.length}곳)
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="max-w-lg mx-auto flex items-center gap-3">
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
            이전
          </button>
          <CTAButton
            onClick={handleNextSpot}
            fullWidth
            className="flex-1"
          >
            {currentSpotIndex === spots.length - 1 ? (
              <>
                <Check className="w-5 h-5" />
                완료
              </>
            ) : (
              '다음 장소'
            )}
          </CTAButton>
        </div>
      </div>
    </div>
  );
}
