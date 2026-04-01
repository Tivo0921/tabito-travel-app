import { Info, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MannerTipBoxProps {
  title?: string;
  tips: string[];
  variant?: 'info' | 'do' | 'dont';
}

export function MannerTipBox({ title, tips, variant = 'info' }: MannerTipBoxProps) {
  const variants = {
    info: {
      bg: 'bg-[var(--accent)]/20',
      border: 'border-[var(--accent)]',
      icon: Info,
      iconColor: 'text-[var(--accent)]',
      title: title || '매너 팁',
    },
    do: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: Check,
      iconColor: 'text-green-600',
      title: title || '이렇게 하세요',
    },
    dont: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: X,
      iconColor: 'text-red-500',
      title: title || '이건 피하세요',
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className={cn('p-4 rounded-2xl border', config.bg, config.border)}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn('w-5 h-5', config.iconColor)} />
        <h4 className="font-semibold text-[var(--text-main)]">{config.title}</h4>
      </div>
      <ul className="space-y-2">
        {tips.map((tip, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-sub)]">
            <span className={cn(
              'mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0',
              variant === 'do' && 'bg-green-500',
              variant === 'dont' && 'bg-red-400',
              variant === 'info' && 'bg-[var(--accent)]'
            )} />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
