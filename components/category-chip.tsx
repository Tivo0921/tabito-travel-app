'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface CategoryChipProps {
  label: string;
  icon?: LucideIcon;
  isActive?: boolean;
  onClick?: () => void;
}

export function CategoryChip({ label, icon: Icon, isActive = false, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
        isActive
          ? 'bg-[var(--primary)] text-white shadow-md'
          : 'bg-white text-[var(--text-sub)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );
}
