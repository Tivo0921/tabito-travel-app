'use client';

import { useState } from 'react';
import Image from 'next/image';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Sparkles, 
  ChevronRight,
  Clock,
  Info,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/section-header';
import { CTAButton } from '@/components/cta-button';

interface PlanItem {
  id: string;
  time: string;
  title: string;
  type: 'spot' | 'meal' | 'transport';
  mannerTip?: string;
}

const mockPlan = {
  id: 'plan-1',
  title: '도쿄 3일 여행',
  location: '도쿄',
  startDate: '2024-04-15',
  endDate: '2024-04-17',
  days: [
    {
      day: 1,
      date: '4월 15일 (월)',
      items: [
        { id: '1', time: '09:00', title: '하네다 공항 도착', type: 'transport' as const },
        { id: '2', time: '11:00', title: '시부야 스크램블 교차로', type: 'spot' as const, mannerTip: '교차로 중앙에서 멈춰서 사진 찍지 마세요' },
        { id: '3', time: '12:30', title: '라멘 점심', type: 'meal' as const, mannerTip: '라멘은 소리 내어 먹어도 괜찮아요' },
        { id: '4', time: '14:00', title: '하라주쿠 타케시타 거리', type: 'spot' as const },
        { id: '5', time: '16:00', title: '메이지 신궁', type: 'spot' as const, mannerTip: '참도 가장자리로 걸으세요' },
      ],
    },
    {
      day: 2,
      date: '4월 16일 (화)',
      items: [
        { id: '6', time: '10:00', title: '아사쿠사 센소지', type: 'spot' as const, mannerTip: '2례 2박수 1례 순서 지키기' },
        { id: '7', time: '12:00', title: '나카미세 거리', type: 'spot' as const },
        { id: '8', time: '13:30', title: '스시 점심', type: 'meal' as const },
        { id: '9', time: '15:00', title: '아키하바라', type: 'spot' as const },
      ],
    },
  ],
};

export default function PlanPage() {
  const [aiPrompt, setAiPrompt] = useState('');
  const [activeDay, setActiveDay] = useState(1);
  const [showNewPlan, setShowNewPlan] = useState(false);

  const handleAiSubmit = () => {
    // TODO: Implement AI route generation with Supabase
    console.log('AI Prompt:', aiPrompt);
    setAiPrompt('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transport':
        return '✈️';
      case 'meal':
        return '🍜';
      default:
        return '📍';
    }
  };

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            여행 계획
          </h1>
          <button 
            onClick={() => setShowNewPlan(true)}
            className="p-2 bg-[var(--primary-soft)] rounded-full"
          >
            <Plus className="w-5 h-5 text-[var(--primary)]" />
          </button>
        </div>
        <p className="text-[var(--text-sub)]">
          AI와 함께 일정을 만들어보세요
        </p>
      </header>

      {/* AI Prompt Box */}
      <div className="px-5 mb-6">
        <div className="p-4 bg-gradient-to-r from-[var(--primary-soft)] to-[var(--accent)]/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
            <span className="font-semibold text-[var(--text-main)]">AI 루트 추천</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="예: 도쿄에서 라멘 맛집 중심 1일 코스"
              className="flex-1 px-4 py-3 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <button
              onClick={handleAiSubmit}
              className="p-3 bg-[var(--primary)] rounded-xl hover:bg-[var(--primary)]/90 transition-colors"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Current Plan */}
      <section className="px-5 mb-6">
        <div className="p-4 bg-white rounded-2xl shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                {mockPlan.title}
              </h2>
              <div className="flex items-center gap-3 text-sm text-[var(--text-sub)] mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {mockPlan.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {mockPlan.startDate} - {mockPlan.endDate}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--muted)]" />
          </div>

          {/* Day Tabs */}
          <div className="flex gap-2 mb-4">
            {mockPlan.days.map((day) => (
              <button
                key={day.day}
                onClick={() => setActiveDay(day.day)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  activeDay === day.day
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-gray-100 text-[var(--text-sub)]'
                )}
              >
                Day {day.day}
              </button>
            ))}
          </div>

          {/* Day Schedule */}
          {mockPlan.days
            .filter((day) => day.day === activeDay)
            .map((day) => (
              <div key={day.day}>
                <p className="text-sm text-[var(--muted)] mb-3">{day.date}</p>
                <div className="space-y-3">
                  {day.items.map((item, index) => (
                    <div key={item.id} className="relative">
                      {/* Timeline */}
                      {index !== day.items.length - 1 && (
                        <div className="absolute left-[23px] top-10 w-0.5 h-[calc(100%+12px)] bg-gray-200" />
                      )}
                      
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl">
                            {getTypeIcon(item.type)}
                          </div>
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-[var(--text-main)]">
                                {item.title}
                              </p>
                              <p className="text-sm text-[var(--muted)] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.time}
                              </p>
                            </div>
                          </div>
                          {item.mannerTip && (
                            <div className="mt-2 flex items-start gap-2 p-2.5 bg-[var(--accent)]/10 rounded-xl">
                              <Info className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-[var(--text-sub)]">
                                {item.mannerTip}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="px-5 mb-8">
        <SectionHeader title="빠른 추가" />
        <div className="grid grid-cols-2 gap-3">
          <button className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left">
            <div className="w-10 h-10 bg-[var(--primary-soft)] rounded-xl flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <p className="font-medium text-[var(--text-main)]">장소 추가</p>
            <p className="text-xs text-[var(--muted)]">방문하고 싶은 곳</p>
          </button>
          <button className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left">
            <div className="w-10 h-10 bg-[var(--accent)]/30 rounded-xl flex items-center justify-center mb-3">
              <Info className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <p className="font-medium text-[var(--text-main)]">매너 팁 추가</p>
            <p className="text-xs text-[var(--muted)]">상황별 에티켓</p>
          </button>
        </div>
      </section>

      {/* New Plan Modal Placeholder */}
      {showNewPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-bold text-[var(--text-main)] mb-4">
              새 여행 계획
            </h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                  여행 이름
                </label>
                <input
                  type="text"
                  placeholder="예: 오사카 맛집 투어"
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                  목적지
                </label>
                <input
                  type="text"
                  placeholder="예: 오사카"
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                    시작일
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                    종료일
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewPlan(false)}
                className="flex-1 py-3 border border-[var(--border)] rounded-2xl font-medium"
              >
                취소
              </button>
              <CTAButton onClick={() => setShowNewPlan(false)} className="flex-1">
                만들기
              </CTAButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
