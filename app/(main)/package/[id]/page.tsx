'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Play,
  Check,
  Heart,
  Share2,
  ShoppingBag,
  MessageCircle,
} from 'lucide-react';
import { cn, getYouTubeEmbedUrl } from '@/lib/utils';
import { CTAButton } from '@/components/cta-button';
import { GuideProfileBadge } from '@/components/guide-profile-badge';
import { SpotProgressItem } from '@/components/spot-progress-item';
import { createClient } from '@/lib/supabase/client';
import {
  getPackageById,
  getSpotsByPackageId,
  getReviewsByPackageId,
  isPackageSaved,
  savePackage,
  unsavePackage,
  hasPurchased,
  getPackageCreatorUserId,
  getOrCreateChatThread,
} from '@/lib/supabase/queries';
import { useT } from '@/lib/i18n/provider';
import type { Package, Spot, Review } from '@/lib/types';

type TabType = 'about' | 'manner' | 'review';

export default function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useT();
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [isSaved, setIsSaved] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [canChat, setCanChat] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPackageById(id).then(setPkg).finally(() => setLoading(false));
    getSpotsByPackageId(id).then(setSpots);
    getReviewsByPackageId(id).then(setReviews);
    isPackageSaved(id).then(setIsSaved);
    hasPurchased(id).then(setIsPurchased);
    // チャットを出す条件: クリエイターにアカウントがあり、かつ自分自身でないこと。
    // 自分が作ったパッケージを自分で買うと buyer_id = creator_id となり
    // DB制約で弾かれてボタンが無反応になるため、そもそも出さない。
    getPackageCreatorUserId(id).then(async (creatorId) => {
      if (!creatorId) return setCanChat(false);
      const { data: { user } } = await createClient().auth.getUser();
      setCanChat(!!user && user.id !== creatorId);
    });
  }, [id]);

  const handleOpenChat = async () => {
    setOpeningChat(true);
    const thread = await getOrCreateChatThread(id);
    setOpeningChat(false);
    if (thread) router.push(`/chat/${thread.id}`);
  };

  const handleToggleSave = async () => {
    if (isSaved) {
      await unsavePackage(id);
    } else {
      await savePackage(id);
    }
    setIsSaved(!isSaved);
  };

  const handleOpenPurchaseModal = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setPurchaseError(null);
    setShowPurchaseModal(true);
  };

  const handlePurchase = async () => {
    if (!pkg) return;
    setPurchasing(true);
    setPurchaseError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: id }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setShowPurchaseModal(false);
        router.push('/login');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPurchaseError(data.error ?? t('package.error.checkout'));
        setPurchasing(false);
      }
    } catch {
      setPurchaseError(t('package.error.network'));
      setPurchasing(false);
    }
  };

  const handleStartGuide = () => {
    router.push(`/guide/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">{t('common.loading')}</p>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--muted)]">{t('package.notFound')}</p>
        <button
          onClick={() => router.push('/home')}
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold hover:bg-[var(--primary)]/90 transition-colors"
        >
          {t('common.goHome')}
        </button>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'about', label: t('package.tab.about') },
    { id: 'manner', label: t('package.tab.manner') },
    { id: 'review', label: t('package.tab.review', { count: reviews.length }) },
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
              onClick={() => router.push('/home')}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleSave}
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
        <div className="absolute bottom-5 left-5 right-5">
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
      {/* 左右の余白はパネルの内側に持たせる（外側だとヒーロー画像の下端がパネルの脇からはみ出す） */}
      <div className="relative z-10">
        <div className="bg-white rounded-t-3xl px-5 pt-6 pb-32">
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

          {/* Purchased badge */}
          {isPurchased && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-green-50 rounded-xl w-fit">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">{t('package.purchased')}</span>
            </div>
          )}

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
              <div>
                <h3 className="font-semibold text-[var(--text-main)] mb-2">{t('package.section.about')}</h3>
                <p className="text-[var(--text-sub)] leading-relaxed">{pkg.description}</p>
              </div>

              {pkg.tutorial_video_url && (
                <div>
                  <h3 className="font-semibold text-[var(--text-main)] mb-3">{t('package.section.video')}</h3>
                  <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                    {getYouTubeEmbedUrl(pkg.tutorial_video_url) ? (
                      <iframe
                        src={getYouTubeEmbedUrl(pkg.tutorial_video_url)!}
                        title={t('package.section.video')}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        {pkg.image_url && (
                          <Image src={pkg.image_url} alt="Tutorial video" fill className="object-cover" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center">
                            <Play className="w-6 h-6 text-[var(--primary)] ml-1" />
                          </div>
                        </div>
                        <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 rounded text-xs text-white">
                          {t('package.watchBefore')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-[var(--text-main)] mb-3">{t('package.section.included')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {pkg.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-[var(--primary-soft)]/30 rounded-xl">
                      <Check className="w-4 h-4 text-[var(--primary)]" />
                      <span className="text-sm text-[var(--text-main)]">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-[var(--text-main)] mb-3">
                  {t('package.section.spots', { count: spots.length })}
                </h3>
                <div className="space-y-2">
                  {spots.map((spot, index) => (
                    <SpotProgressItem key={spot.id} spot={spot} status={index === 0 ? 'current' : 'upcoming'} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manner' && (
            <div className="space-y-4">
              <p className="text-[var(--text-sub)] mb-4">{t('package.manner.desc')}</p>
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
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                          {review.user.avatar_url ? (
                            <Image src={review.user.avatar_url} alt={review.user.name} fill className="object-cover" />
                          ) : (
                            <span className="text-sm text-gray-500">{review.user.name.charAt(0)}</span>
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-main)]">{review.user?.name}</p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn('w-3.5 h-3.5', i < review.rating ? 'fill-[var(--primary)] text-[var(--primary)]' : 'text-gray-200')}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-[var(--muted)]">{review.created_at.slice(0, 10)}</p>
                    </div>
                    <p className="text-sm text-[var(--text-sub)] leading-relaxed">{review.comment}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-[var(--muted)]">{t('package.review.empty')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      {/* lg:pl-64 … PCではサイドナビ分を空けて本文列と揃える */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[var(--border)] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:pl-64">
        <div className="max-w-lg mx-auto flex items-center gap-4 lg:max-w-6xl lg:px-6">
          {/* ボタンがfullWidthなので、縮まないよう明示する（縮むと「円」が改行される） */}
          <div className="flex-shrink-0 whitespace-nowrap">
            <p className="text-sm text-[var(--text-sub)]">{t('package.price')}</p>
            <p className="text-xl font-bold text-[var(--primary)]">
              {t('common.priceYen', { price: pkg.price.toLocaleString() })}
            </p>
          </div>
          {isPurchased ? (
            <>
              <CTAButton onClick={handleStartGuide} fullWidth>
                {t('package.startGuide')}
              </CTAButton>
              {/* クリエイターのアカウントが無いガイド(シード等)ではチャットを出さない */}
              {canChat && (
                <button
                  onClick={handleOpenChat}
                  disabled={openingChat}
                  aria-label={t('chat.askCreator')}
                  title={t('chat.askCreator')}
                  className="flex-shrink-0 p-3 rounded-2xl border border-[var(--border)] text-[var(--primary)] hover:bg-[var(--primary-soft)]/40 transition-colors disabled:opacity-50"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            <CTAButton onClick={handleOpenPurchaseModal} fullWidth>
              {t('package.buyAndStart')}
            </CTAButton>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-[var(--primary-soft)] rounded-2xl flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-[var(--primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-main)]">{t('package.modal.title')}</h2>
                <p className="text-sm text-[var(--text-sub)]">{pkg.title}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl mb-6">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-sub)]">{t('package.modal.price')}</span>
                <span className="text-xl font-bold text-[var(--primary)]">
                  {t('common.priceYen', { price: pkg.price.toLocaleString() })}
                </span>
              </div>
            </div>

            {purchaseError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 text-center">{purchaseError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowPurchaseModal(false); setPurchaseError(null); }}
                className="flex-1 py-3 border border-[var(--border)] rounded-2xl font-medium"
              >
                {t('common.cancel')}
              </button>
              <CTAButton onClick={handlePurchase} className="flex-1" disabled={purchasing}>
                {purchasing ? t('package.modal.processing') : t('package.modal.buy')}
              </CTAButton>
            </div>

            <p className="text-xs text-[var(--muted)] text-center mt-4">
              {t('package.modal.stripeNote')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
