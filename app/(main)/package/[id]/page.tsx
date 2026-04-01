'use client';

import { use, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Clock, 
  Users, 
  Play, 
  Check,
  Heart,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CTAButton } from '@/components/cta-button';
import { GuideProfileBadge } from '@/components/guide-profile-badge';
import { SpotProgressItem } from '@/components/spot-progress-item';
import { 
  getPackageById, 
  getSpotsByPackageId, 
  getReviewsByPackageId 
} from '@/lib/mock-data';

type TabType = 'about' | 'manner' | 'review';

export default function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [isSaved, setIsSaved] = useState(false);

  const pkg = getPackageById(id);
  const spots = getSpotsByPackageId(id);
  const reviews = getReviewsByPackageId(id);

  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">가이드를 찾을 수 없습니다</p>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'about', label: '소개' },
    { id: 'manner', label: '매너' },
    { id: 'review', label: `리뷰 (${reviews.length})` },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero Image */}
      <div className="relative h-72">
        <Image
          src={pkg.image_url}
          alt={pkg.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 pt-[env(safe-area-inset-top)] px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSaved(!isSaved)}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-full"
              >
                <Heart 
                  className={cn(
                    'w-5 h-5',
                    isSaved ? 'fill-[var(--primary)] text-[var(--primary)]' : 'text-white'
                  )} 
                />
              </button>
              <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full">
                <Share2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 flex-wrap">
            {pkg.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-[var(--text-main)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 -mt-4 relative z-10">
        <div className="bg-white rounded-t-3xl pt-6 pb-32">
          {/* Title & Meta */}
          <h1 className="text-2xl font-bold text-[var(--text-main)] mb-3 text-pretty">
            {pkg.title}
          </h1>
          
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="flex items-center gap-1 text-[var(--text-sub)]">
              <MapPin className="w-4 h-4" />
              {pkg.area}
            </span>
            <span className="flex items-center gap-1 text-[var(--text-sub)]">
              <Clock className="w-4 h-4" />
              {pkg.duration}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-[var(--primary)] text-[var(--primary)]" />
              <span className="font-semibold">{pkg.rating}</span>
              <span className="text-[var(--muted)]">({pkg.review_count})</span>
            </span>
          </div>

          {/* Guide Profile */}
          {pkg.guide && (
            <div className="mb-6">
              <GuideProfileBadge guide={pkg.guide} />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium rounded-xl transition-all',
                  activeTab === tab.id
                    ? 'bg-white text-[var(--text-main)] shadow-sm'
                    : 'text-[var(--text-sub)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold text-[var(--text-main)] mb-2">소개</h3>
                <p className="text-[var(--text-sub)] leading-relaxed">
                  {pkg.description}
                </p>
              </div>

              {/* Tutorial Video */}
              {pkg.tutorial_video_url && (
                <div>
                  <h3 className="font-semibold text-[var(--text-main)] mb-3">튜토리얼 영상</h3>
                  <div className="relative aspect-video bg-gray-100 rounded-2xl overflow-hidden">
                    <Image
                      src={pkg.image_url}
                      alt="Tutorial video"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <button className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                        <Play className="w-6 h-6 text-[var(--primary)] ml-1" />
                      </button>
                    </div>
                    <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 rounded text-xs text-white">
                      출발 전 시청
                    </div>
                  </div>
                </div>
              )}

              {/* What You Get */}
              <div>
                <h3 className="font-semibold text-[var(--text-main)] mb-3">포함 내용</h3>
                <div className="grid grid-cols-2 gap-2">
                  {pkg.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-[var(--primary-soft)]/30 rounded-xl"
                    >
                      <Check className="w-4 h-4 text-[var(--primary)]" />
                      <span className="text-sm text-[var(--text-main)]">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spots */}
              <div>
                <h3 className="font-semibold text-[var(--text-main)] mb-3">
                  포함 장소 ({spots.length}곳)
                </h3>
                <div className="space-y-2">
                  {spots.map((spot, index) => (
                    <SpotProgressItem
                      key={spot.id}
                      spot={spot}
                      status={index === 0 ? 'current' : 'upcoming'}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manner' && (
            <div className="space-y-4">
              <p className="text-[var(--text-sub)] mb-4">
                이 가이드에서 알려드리는 매너 포인트입니다.
              </p>
              {spots.slice(0, 3).map((spot) => (
                <div key={spot.id} className="p-4 bg-[var(--accent)]/10 rounded-2xl">
                  <h4 className="font-semibold text-[var(--text-main)] mb-2">{spot.name}</h4>
                  <ul className="space-y-1.5">
                    {spot.etiquette_tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-sub)]">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'review' && (
            <div className="space-y-4">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      {review.user && (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          <Image
                            src={review.user.avatar_url || '/placeholder.png'}
                            alt={review.user.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-main)]">
                          {review.user?.name}
                        </p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                'w-3.5 h-3.5',
                                i < review.rating
                                  ? 'fill-[var(--primary)] text-[var(--primary)]'
                                  : 'text-gray-200'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-[var(--muted)]">{review.created_at}</p>
                    </div>
                    <p className="text-sm text-[var(--text-sub)] leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-[var(--muted)]">아직 리뷰가 없습니다</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div>
            <p className="text-sm text-[var(--text-sub)]">가격</p>
            <p className="text-xl font-bold text-[var(--primary)]">
              {pkg.price.toLocaleString()}원
            </p>
          </div>
          <Link href={`/guide/${pkg.id}`} className="flex-1">
            <CTAButton fullWidth>
              가이드 시작하기
            </CTAButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
