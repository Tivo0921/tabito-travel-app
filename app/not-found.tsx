'use client';

import Link from 'next/link';
import { Logo } from '@/components/logo';
import { useT } from '@/lib/i18n/provider';

export default function NotFound() {
  const t = useT();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf4f4] to-white flex flex-col items-center justify-center px-8">
      <div className="text-center max-w-sm">
        <Logo size="lg" className="mx-auto mb-8" />

        <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-white shadow-lg flex items-center justify-center">
          <span className="text-4xl">🧭</span>
        </div>

        <p className="text-5xl font-bold text-[#B81417] mb-3">404</p>
        <h1 className="text-xl font-bold text-gray-800 mb-3">
          {t('notFound.title')}
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          {t('notFound.desc')}
        </p>

        <Link
          href="/home"
          className="inline-block px-6 py-3 bg-[#B81417] text-white rounded-2xl font-semibold hover:opacity-90 transition-opacity"
        >
          {t('error.backHome')}
        </Link>
      </div>
    </div>
  );
}
