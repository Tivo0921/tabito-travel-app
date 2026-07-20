'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download, FileJson, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function DataDownloadPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setStatus('loading');
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('データを書き出すにはログインが必要です。');
        setStatus('idle');
        router.push('/login');
        return;
      }

      // 自分に紐づくデータを収集
      const [profile, plans, saved, purchases] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('plans').select('*').eq('user_id', user.id),
        supabase.from('saved_items').select('*').eq('user_id', user.id),
        supabase.from('purchases').select('*').eq('user_id', user.id),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email },
        profile: profile.data ?? null,
        plans: plans.data ?? [],
        saved_items: saved.data ?? [],
        purchases: purchases.data ?? [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tabito-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus('idle');
    } catch (e) {
      setError('データの書き出しに失敗しました。時間をおいて再度お試しください。');
      setStatus('idle');
      console.error('data download error:', e);
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
          <span className="text-sm font-medium">プライバシー設定</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">データをダウンロード</h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">あなたのデータをまとめて書き出せます</p>
      </header>

      <div className="px-5 space-y-6 pb-8">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center">
              <FileJson className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-main)]">JSON 形式</p>
              <p className="text-xs text-[var(--muted)]">プロフィール・計画・保存・購入履歴</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-sub)] leading-relaxed">
            ボタンを押すと、あなたのアカウントに紐づくデータを 1 つのファイルにまとめて端末にダウンロードします。
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={status === 'loading'}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[var(--primary)] text-white rounded-2xl font-semibold hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              準備中...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              データをダウンロード
            </>
          )}
        </button>

        <p className="text-xs text-[var(--muted)] text-center px-4 leading-relaxed">
          ダウンロードしたファイルには個人情報が含まれます。取り扱いにご注意ください。
        </p>
      </div>
    </div>
  );
}
