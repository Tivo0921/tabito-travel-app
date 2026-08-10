'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CTAButton } from '@/components/cta-button';
import { Logo, LogoMark } from '@/components/logo';
import { useT } from '@/lib/i18n/provider';
import type { TranslationKey } from '@/lib/i18n/dictionaries/ja';

const ONBOARDING_SLIDES = [
  { titleKey: 'onboarding.slide1.title', descKey: 'onboarding.slide1.desc', subtitle: 'Travel Japan, Deeper', gradient: 'from-[var(--primary-soft)] to-white' },
  { titleKey: 'onboarding.slide2.title', descKey: 'onboarding.slide2.desc', subtitle: 'Before You Arrive', gradient: 'from-[var(--accent)]/30 to-white' },
  { titleKey: 'onboarding.slide3.title', descKey: 'onboarding.slide3.desc', subtitle: 'Learn in Context', gradient: 'from-[var(--primary-soft)] to-white' },
  { titleKey: 'onboarding.slide4.title', descKey: 'onboarding.slide4.desc', subtitle: 'Beyond Tourism', gradient: 'from-[var(--accent)]/30 to-white' },
  { titleKey: 'onboarding.slide5.title', descKey: 'onboarding.slide5.desc', subtitle: 'Start Your Journey', gradient: 'from-[var(--primary-soft)] to-[var(--accent)]/20', isLast: true },
] satisfies { titleKey: TranslationKey; descKey: TranslationKey; subtitle: string; gradient: string; isLast?: boolean }[];

export default function OnboardingPage() {
  const t = useT();
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();
  const slide = ONBOARDING_SLIDES[currentSlide];

  const nextSlide = () => {
    if (currentSlide < ONBOARDING_SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleGetStarted = () => {
    router.push('/login');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-b flex flex-col',
      slide.gradient
    )}>
      {/* Header */}
      <header className="flex items-center justify-between p-4 pt-[env(safe-area-inset-top)]">
        {currentSlide > 0 ? (
          <button
            onClick={prevSlide}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-[var(--text-main)]" />
          </button>
        ) : (
          <div className="w-10" />
        )}
        <Logo size="sm" priority />
        {!slide.isLast && (
          <button
            onClick={() => router.push('/home')}
            className="text-sm text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
          >
            {t('onboarding.skip')}
          </button>
        )}
        {slide.isLast && <div className="w-16" />}
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        {/* Illustration Placeholder */}
        {currentSlide === 0 ? (
          <LogoMark size="2xl" className="mb-8 drop-shadow-xl" priority />
        ) : (
          <div className="w-64 h-64 mb-8 rounded-3xl bg-white/60 backdrop-blur-sm shadow-lg flex items-center justify-center">
            <div className="text-6xl text-[var(--primary)]">
              {currentSlide === 1 && '📚'}
              {currentSlide === 2 && '🎌'}
              {currentSlide === 3 && '🗾'}
              {currentSlide === 4 && '✨'}
            </div>
          </div>
        )}

        {/* Text Content */}
        <div className="text-center max-w-sm">
          <p className="text-sm font-medium text-[var(--primary)] mb-2">
            {slide.subtitle}
          </p>
          <h1 className="text-3xl font-bold text-[var(--text-main)] mb-4 text-balance">
            {t(slide.titleKey)}
          </h1>
          <p className="text-[var(--text-sub)] leading-relaxed text-pretty">
            {t(slide.descKey)}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {ONBOARDING_SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                'h-2 rounded-full transition-all',
                index === currentSlide
                  ? 'w-8 bg-[var(--primary)]'
                  : 'w-2 bg-[var(--border)]'
              )}
            />
          ))}
        </div>

        {/* CTA Buttons */}
        {slide.isLast ? (
          <div className="space-y-3">
            <CTAButton onClick={handleGetStarted} fullWidth size="lg">
              {t('onboarding.start')}
            </CTAButton>
            <button
              onClick={handleLogin}
              className="w-full text-center text-sm text-[var(--text-sub)] hover:text-[var(--primary)] transition-colors py-2"
            >
              {t('onboarding.hasAccount')} <span className="font-semibold">{t('onboarding.login')}</span>
            </button>
          </div>
        ) : (
          <CTAButton onClick={nextSlide} fullWidth size="lg">
            {t('onboarding.next')}
            <ChevronRight className="w-5 h-5" />
          </CTAButton>
        )}
      </footer>
    </div>
  );
}
