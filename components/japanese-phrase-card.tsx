import { Volume2, MessageCircle } from 'lucide-react';
import type { JapanesePhrase } from '@/lib/types';

interface JapanesePhraseCardProps {
  phrase: JapanesePhrase;
}

export function JapanesePhraseCard({ phrase }: JapanesePhraseCardProps) {
  return (
    <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <span className="px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-medium rounded-full flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />
          {phrase.context}
        </span>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Volume2 className="w-4 h-4 text-[var(--muted)]" />
        </button>
      </div>
      <p className="text-lg font-bold text-[var(--text-main)] mb-1">
        {phrase.japanese}
      </p>
      <p className="text-sm text-[var(--primary)] mb-2">
        {phrase.reading}
      </p>
      <p className="text-sm text-[var(--text-sub)]">
        {phrase.korean}
      </p>
    </div>
  );
}
