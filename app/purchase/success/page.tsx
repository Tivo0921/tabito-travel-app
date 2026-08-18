'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n/provider';

function SuccessInner() {
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [packageId, setPackageId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    fetch(`/api/checkout/verify?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setPackageId(data.package_id);
          setStatus('success');
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
        <p className="text-[var(--text-sub)]">{t('purchase.verifying')}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-[var(--text-main)] font-semibold">{t('purchase.failed.title')}</p>
        <p className="text-[var(--text-sub)] text-sm text-center">
          {t('purchase.failed.desc')}
        </p>
        <button
          onClick={() => router.push('/home')}
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold"
        >
          {t('common.goHome')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="w-10 h-10 text-green-600" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">{t('purchase.success.title')}</h1>
        <p className="text-[var(--text-sub)]">{t('purchase.success.desc')}</p>
      </div>
      <button
        onClick={() => router.push(packageId ? `/guide/${packageId}` : '/home')}
        className="w-full max-w-xs py-4 bg-[var(--primary)] text-white rounded-2xl font-semibold text-lg"
      >
        {t('package.startGuide')}
      </button>
    </div>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
