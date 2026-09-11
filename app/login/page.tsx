'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/logo';
import { useT } from '@/lib/i18n/provider';

function LoginInner() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  // 遷移が始まらないときだけ出す案内。押し直しを防ぐ
  const [slow, setSlow] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 遷移前にアンマウントされたらタイマーを片付ける
  useEffect(() => () => {
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
  }, []);
  // 理由コードで文言を出し分ける。profile_failed は「ログインは通ったが
  // プロフィール作成に失敗した」状態で、汎用の失敗メッセージだと誤解を招く。
  const errorCode = searchParams.get('error');
  const [error, setError] = useState<string | null>(
    errorCode === 'profile_failed'
      ? t('login.profileFailed')
      : errorCode
        ? t('login.failed')
        : null,
  );

  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setSlow(false);

    // リダイレクトが始まらないまま黙って待たせない。押し直しや再読み込みが
    // 二重フローを生み、まさに上の残骸を作る原因になる。
    const slowTimer = setTimeout(() => setSlow(true), 4000);
    slowTimerRef.current = slowTimer;

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      // 成功時はブラウザが遷移するのでここから先は基本的に実行されない
      if (error) {
        clearTimeout(slowTimer);
        setError(error.message);
        setLoading(false);
        setSlow(false);
      }
    } catch (e) {
      // 例外だと戻り値のエラーを見る経路に入らず、loading が立ったままになる。
      // 原因はストレージ不可（プライベートブラウズ等）だけでなく通信断もあり得るので、
      // 断定せず両方の可能性を伝える。
      console.error('signInWithOAuth threw:', e);
      clearTimeout(slowTimer);
      setError(t('login.startFailed'));
      setLoading(false);
      setSlow(false);
    }
  };

  const handleGuestAccess = () => {
    router.push('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--primary-soft)] to-white flex flex-col pt-[env(safe-area-inset-top)]">
      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        {/* Logo area */}
        <Logo size="xl" className="mb-8" priority />

        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">
            {t('login.welcome')}
          </h1>
          <p className="text-[var(--text-sub)]">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full max-w-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        {/* Login Buttons */}
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white border border-[var(--border)] rounded-2xl font-semibold text-[var(--text-main)] hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? t('login.processing') : t('login.google')}
          </button>

          {/* 遷移が始まらないときだけ出す。押し直しは二重フローを生み、
              消費されない code-verifier を残す原因になる */}
          {slow && (
            <p className="text-xs text-[var(--text-sub)] text-center">
              {t('login.takingLonger')}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full max-w-sm my-6">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-sm text-[var(--muted)]">{t('login.or')}</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        {/* Guest */}
        <button
          onClick={handleGuestAccess}
          className="text-sm text-[var(--text-sub)] hover:text-[var(--primary)] transition-colors"
        >
          {t('login.guest')}
        </button>
      </main>

      {/* Footer */}
      <footer className="p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-center">
        <p className="text-xs text-[var(--muted)]">
          {t('login.agreePrefix')}
          <span className="underline">{t('login.terms')}</span>{t('login.agreeMiddle')}
          <span className="underline">{t('login.privacy')}</span>{t('login.agreeSuffix')}
        </p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
