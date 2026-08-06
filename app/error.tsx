'use client';

import { useEffect } from 'react';
import { Logo } from '@/components/logo';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf4f4] to-white flex flex-col items-center justify-center px-8">
      <div className="text-center max-w-sm">
        <Logo size="lg" className="mx-auto mb-8" />

        <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-white shadow-lg flex items-center justify-center">
          <span className="text-4xl">🙇</span>
        </div>

        <h1 className="text-xl font-bold text-gray-800 mb-3">
          問題が発生しました
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          一時的なエラーが発生しました。
          <br />
          もう一度お試しください。
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#B81417] text-white rounded-2xl font-semibold hover:opacity-90 transition-opacity"
          >
            再読み込み
          </button>
          <a
            href="/home"
            className="px-6 py-3 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
