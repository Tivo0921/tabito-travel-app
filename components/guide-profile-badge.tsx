import Image from 'next/image';
import { Star, MapPin } from 'lucide-react';
import type { Guide } from '@/lib/types';
import { useT } from '@/lib/i18n/provider';

interface GuideProfileBadgeProps {
  guide: Guide;
  variant?: 'default' | 'compact';
}

export function GuideProfileBadge({ guide, variant = 'default' }: GuideProfileBadgeProps) {
  const t = useT();
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 rounded-full overflow-hidden">
          <Image
            src={guide.avatar_url}
            alt={guide.name}
            fill
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-main)]">{guide.name}</p>
          <p className="text-xs text-[var(--text-sub)]">{t('guideBadge.location', { location: guide.location })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--primary-soft)]/30 rounded-2xl">
      <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-white">
        <Image
          src={guide.avatar_url}
          alt={guide.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-[var(--text-main)]">{guide.name}</p>
        <div className="flex items-center gap-2 text-sm text-[var(--text-sub)]">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {guide.location}
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-[var(--primary)] text-[var(--primary)]" />
            {guide.rating}
          </span>
        </div>
      </div>
    </div>
  );
}
