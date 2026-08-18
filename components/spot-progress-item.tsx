'use client';

import Image from 'next/image';
import { Check, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Spot } from '@/lib/types';
import { useT } from '@/lib/i18n/provider';

interface SpotProgressItemProps {
  spot: Spot;
  status: 'completed' | 'current' | 'upcoming';
  onClick?: () => void;
}

export function SpotProgressItem({ spot, status, onClick }: SpotProgressItemProps) {
  const t = useT();
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left',
        status === 'current' && 'bg-[var(--primary-soft)] ring-2 ring-[var(--primary)]',
        status === 'completed' && 'bg-gray-50 opacity-70',
        status === 'upcoming' && 'bg-white hover:bg-gray-50'
      )}
    >
      <div className="relative">
        <div className={cn(
          'relative w-14 h-14 rounded-xl overflow-hidden',
          status === 'completed' && 'grayscale'
        )}>
          <Image
            src={spot.image_url}
            alt={spot.name}
            fill
            className="object-cover"
          />
        </div>
        {status === 'completed' && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
        {status === 'current' && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">{spot.order}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-semibold text-sm line-clamp-1',
          status === 'completed' ? 'text-[var(--muted)]' : 'text-[var(--text-main)]'
        )}>
          {spot.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-[var(--text-sub)] mt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {t('spot.minutes', { count: spot.duration_minutes ?? 0 })}
          </span>
        </div>
      </div>
      {status === 'current' && (
        <div className="flex-shrink-0">
          <span className="px-2.5 py-1 bg-[var(--primary)] text-white text-xs font-semibold rounded-full">
            {t('spot.current')}
          </span>
        </div>
      )}
    </button>
  );
}
