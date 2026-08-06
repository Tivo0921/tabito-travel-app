'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CTAButton } from '@/components/cta-button';
import { Logo, LogoMark } from '@/components/logo';

const onboardingSlides = [
  {
    title: '日本をもっと深く',
    subtitle: 'Travel Japan, Deeper',
    description: '表面的な観光を超え、本物の日本に出会いましょう。現地に住む先輩たちが教える隠れたストーリー。',
    gradient: 'from-[var(--primary-soft)] to-white',
  },
  {
    title: '出発前に、日本を理解しよう',
    subtitle: 'Before You Arrive',
    description: '旅行前のチュートリアル動画で、日本の文化とマナーを事前に学んで出発しましょう。',
    gradient: 'from-[var(--accent)]/30 to-white',
  },
  {
    title: '場面の中でマナーを学ぼう',
    subtitle: 'Learn in Context',
    description: '各スポットで必要なマナーと日本語表現をその場でお伝えします。',
    gradient: 'from-[var(--primary-soft)] to-white',
  },
  {
    title: '観光地を超えて',
    subtitle: 'Beyond Tourism',
    description: '地元の人だけが知る隠れスポット、ローカルグルメ、本物の日本の日常を体験しよう。',
    gradient: 'from-[var(--accent)]/30 to-white',
  },
  {
    title: '旅を始めよう',
    subtitle: 'Start Your Journey',
    description: 'TABITOと一緒に特別な日本旅行を始めましょう。',
    gradient: 'from-[var(--primary-soft)] to-[var(--accent)]/20',
    isLast: true,
  },
];

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();
  const slide = onboardingSlides[currentSlide];

  const nextSlide = () => {
    if (currentSlide < onboardingSlides.length - 1) {
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
            スキップ
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
            {slide.title}
          </h1>
          <p className="text-[var(--text-sub)] leading-relaxed text-pretty">
            {slide.description}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {onboardingSlides.map((_, index) => (
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
              はじめる
            </CTAButton>
            <button
              onClick={handleLogin}
              className="w-full text-center text-sm text-[var(--text-sub)] hover:text-[var(--primary)] transition-colors py-2"
            >
              すでにアカウントをお持ちですか？ <span className="font-semibold">ログイン</span>
            </button>
          </div>
        ) : (
          <CTAButton onClick={nextSlide} fullWidth size="lg">
            次へ
            <ChevronRight className="w-5 h-5" />
          </CTAButton>
        )}
      </footer>
    </div>
  );
}
