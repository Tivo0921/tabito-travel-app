'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/provider';


export default function DeleteAccountPage() {
  const t = useT();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim() === t('deleteAccount.confirmWord');

  const handleDelete = async () => {
    if (!canDelete) return;
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        throw new Error('deletion_failed');
      }
      // セッションを破棄してログイン画面へ
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (e) {
      setError(t('deleteAccount.failed'));
      setStatus('idle');
      console.error('delete account error:', e);
    }
  };

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
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{t('deleteAccount.title')}</h1>
      </header>

      <div className="px-5 space-y-6 pb-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 leading-relaxed">
            <p className="font-semibold mb-1">{t('deleteAccount.warning')}</p>
            <p>
              {t('deleteAccount.dataList')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-sm text-[var(--text-sub)] leading-relaxed mb-4">
            {t('deleteAccount.confirmPrefix')}<span className="font-bold text-[var(--text-main)]">{t('deleteAccount.confirmWord')}</span>{t('deleteAccount.confirmSuffix')}
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t('deleteAccount.confirmWord')}
            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        <button
          onClick={handleDelete}
          disabled={!canDelete || status === 'loading'}
          className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 text-white rounded-2xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('deleteAccount.deleting')}
            </>
          ) : (
            t('deleteAccount.submit')
          )}
        </button>

        <button
          onClick={() => router.back()}
          className="w-full py-3 text-sm text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
