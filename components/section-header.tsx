'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useT } from '@/lib/i18n/provider';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  actionLabel?: string;
}

export function SectionHeader({ title, subtitle, href, actionLabel }: SectionHeaderProps) {
  const t = useT();
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">{title}</h2>
        {subtitle && (
          <p className="text-sm text-[var(--text-sub)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link 
          href={href}
          className="flex items-center gap-0.5 text-sm font-medium text-[var(--primary)] hover:underline"
        >
          {actionLabel ?? t('common.seeMore')}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
