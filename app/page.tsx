'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CTAButton } from '@/components/cta-button';

const onboardingSlides = [
  {
    title: '일본을 더 깊게',
    subtitle: 'Travel Japan, Deeper',
    description: '표면적인 관광을 넘어, 진짜 일본을 만나보세요. 현지에 사는 한국인 선배들이 알려주는 숨은 이야기.',
    gradient: 'from-[var(--primary-soft)] to-white',
  },
  {
    title: '출발 전, 일본을 이해하세요',
    subtitle: 'Before You Arrive',
    description: '여행 전 튜토리얼 영상으로 일본의 문화와 매너를 미리 익히고 떠나세요.',
    gradient: 'from-[var(--accent)]/30 to-white',
  },
  {
    title: '상황 속에서 매너를 배워요',
    subtitle: 'Learn in Context',
    description: '각 장소에서 필요한 매너와 일본어 표현을 적재적소에 알려드립니다.',
    gradient: 'from-[var(--primary-soft)] to-white',
  },
  {
    title: '관광지를 넘어서',
    subtitle: 'Beyond Tourism',
    description: '현지인만 아는 숨은 명소, 로컬 맛집, 진짜 일본의 일상을 경험하세요.',
    gradient: 'from-[var(--accent)]/30 to-white',
  },
  {
    title: '여행을 시작하세요',
    subtitle: 'Start Your Journey',
    description: 'TABITO와 함께 특별한 일본 여행을 시작해보세요.',
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
    router.push('/home');
  };

  const handleLogin = () => {
    // TODO: Implement login with Supabase Auth
    router.push('/home');
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
        <div className="text-2xl font-bold text-[var(--primary)]">
          TABITO
        </div>
        {!slide.isLast && (
          <button
            onClick={() => router.push('/home')}
            className="text-sm text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
          >
            건너뛰기
          </button>
        )}
        {slide.isLast && <div className="w-16" />}
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        {/* Illustration Placeholder */}
        <div className="w-64 h-64 mb-8 rounded-3xl bg-white/60 backdrop-blur-sm shadow-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-2 text-[var(--primary)]">
              {currentSlide === 0 && '🇯🇵'}
              {currentSlide === 1 && '📚'}
              {currentSlide === 2 && '🎌'}
              {currentSlide === 3 && '🗾'}
              {currentSlide === 4 && '✨'}
            </div>
            <p className="text-sm text-[var(--muted)]">Illustration</p>
          </div>
        </div>

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
              시작하기
            </CTAButton>
            <button
              onClick={handleLogin}
              className="w-full text-center text-sm text-[var(--text-sub)] hover:text-[var(--primary)] transition-colors py-2"
            >
              이미 계정이 있으신가요? <span className="font-semibold">로그인</span>
            </button>
          </div>
        ) : (
          <CTAButton onClick={nextSlide} fullWidth size="lg">
            다음
            <ChevronRight className="w-5 h-5" />
          </CTAButton>
        )}
      </footer>
    </div>
  );
}
