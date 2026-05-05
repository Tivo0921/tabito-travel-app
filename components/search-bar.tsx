'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

export function SearchBar({ 
  placeholder = '検索キーワードを入力',
  onSearch,
  className 
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border transition-all',
        isFocused 
          ? 'border-[var(--primary)] ring-2 ring-[var(--primary-soft)]' 
          : 'border-[var(--border)]'
      )}>
        <Search className="w-5 h-5 text-[var(--muted)] flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[var(--text-main)] placeholder:text-[var(--muted)] focus:outline-none text-base"
        />
      </div>
    </form>
  );
}
