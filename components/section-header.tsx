import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  actionLabel?: string;
}

export function SectionHeader({ title, subtitle, href, actionLabel = '더보기' }: SectionHeaderProps) {
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
          {actionLabel}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
