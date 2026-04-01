'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface CTAButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'default' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export function CTAButton({
  children,
  onClick,
  variant = 'primary',
  size = 'default',
  fullWidth = false,
  disabled = false,
  loading = false,
  className,
  type = 'button',
}: CTAButtonProps) {
  const variants = {
    primary: 'bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 shadow-lg shadow-[var(--primary)]/25',
    secondary: 'bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary-soft)]/80',
    outline: 'bg-white border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-soft)]/30',
  };

  const sizes = {
    default: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all active:scale-[0.98]',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
}
