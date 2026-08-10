'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/provider';

export default function ReviewPage() {
  const t = useT();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    // TODO: フィードバックをSupabaseに保存 / 高評価はストアレビューへ誘導
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="pt-[env(safe-area-inset-top)] min-h-[80vh] flex flex-col items-center justify-center px-8 text-center">
        <div className="text-5xl mb-4">🙏</div>
        <h1 className="text-xl font-bold text-[var(--text-main)] mb-2">{t('review.thanks')}</h1>
        <p className="text-sm text-[var(--text-sub)] mb-8">
          {t('review.note')}
        </p>
        <button
          onClick={() => router.push('/home')}
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold hover:bg-[var(--primary)]/90 transition-colors"
        >
          {t('error.backHome')}
        </button>
      </div>
    );
  }

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      <header className="px-5 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[var(--primary)] mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{t('common.settings')}</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{t('review.title')}</h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">{t('review.subtitle')}</p>
      </header>

      <div className="px-5 space-y-6 pb-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center">
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={t('review.star', { count: n })}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'w-9 h-9 transition-colors',
                    (hover || rating) >= n
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-200 fill-gray-200'
                  )}
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-[var(--text-sub)] h-5">
            {rating > 0 && ['', t('review.rating1'), t('review.rating2'), t('review.rating3'), t('review.rating4'), t('review.rating5')][rating]}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
            {t('review.commentLabel')}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder={t('review.placeholder')}
            className="w-full mt-2 text-sm text-[var(--text-main)] bg-transparent resize-none focus:outline-none placeholder:text-[var(--muted)]"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={rating === 0}
          className="w-full py-4 bg-[var(--primary)] text-white rounded-2xl font-semibold hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-40"
        >
          {t('review.submit')}
        </button>
      </div>
    </div>
  );
}
