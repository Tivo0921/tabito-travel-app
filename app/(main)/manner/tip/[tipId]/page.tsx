'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Check } from 'lucide-react';
import { MannerTipBox } from '@/components/manner-tip-box';
import { CTAButton } from '@/components/cta-button';
import { getMannerTipById } from '@/lib/supabase/queries';
import type { MannerTip } from '@/lib/types';
import { useT } from '@/lib/i18n/provider';

export default function MannerTipDetailPage({ params }: { params: Promise<{ tipId: string }> }) {
  const t = useT();
  const { tipId } = use(params);
  const router = useRouter();
  const [tip, setTip] = useState<MannerTip | null>(null);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    getMannerTipById(tipId).then(setTip);
  }, [tipId]);

  if (!tip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">{t('common.loading')}</p>
      </div>
    );
  }

  const handleAddToPlan = () => {
    // TODO: Implement with Supabase
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[var(--border)] pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
          </button>
          <h1 className="text-lg font-semibold text-[var(--text-main)]">
            {t('mannerTip.label')}
          </h1>
        </div>
      </header>

      <div className="px-5 py-6">
        {/* Image */}
        {tip.image_url && (
          <div className="relative aspect-video rounded-2xl overflow-hidden mb-6">
            <Image
              src={tip.image_url}
              alt={tip.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Title & Description */}
        <h1 className="text-2xl font-bold text-[var(--text-main)] mb-3">
          {tip.title}
        </h1>
        <p className="text-[var(--text-sub)] leading-relaxed mb-6">
          {tip.description}
        </p>

        {/* Do & Don't */}
        <div className="space-y-4">
          <MannerTipBox tips={tip.do_tips} variant="do" />
          <MannerTipBox tips={tip.dont_tips} variant="dont" />
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="max-w-lg mx-auto">
          <CTAButton
            onClick={handleAddToPlan}
            fullWidth
            variant={isAdded ? 'secondary' : 'primary'}
          >
            {isAdded ? (
              <>
                <Check className="w-5 h-5" />
                {t('mannerTip.added')}
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                {t('mannerTip.add')}
              </>
            )}
          </CTAButton>
        </div>
      </div>
    </div>
  );
}
