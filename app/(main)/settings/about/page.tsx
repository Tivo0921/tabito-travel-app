'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Github, Globe, Heart } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useT } from '@/lib/i18n/provider';

const APP_VERSION = 'v1.0.0';

export default function AboutPage() {
  const t = useT();
  const router = useRouter();

  const links = [
    { label: t('settings.item.terms'), href: '/settings/terms' },
    { label: t('privacy.policy'), href: '/settings/privacy/policy' },
    { label: t('about.helpContact'), href: '/help' },
  ];

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
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{t('about.title')}</h1>
      </header>

      <div className="px-5 space-y-6 pb-8">
        {/* Brand */}
        <div className="flex flex-col items-center text-center py-6">
          <Logo size="lg" className="mb-2" />
          <p className="text-sm text-[var(--text-sub)] mt-1">{t('about.tagline')}</p>
          <span className="mt-3 px-3 py-1 rounded-full bg-white text-xs font-medium text-[var(--muted)] shadow-sm">
            {APP_VERSION}
          </span>
        </div>

        <p className="text-sm text-[var(--text-sub)] leading-relaxed px-1">
          {t('about.desc')}
        </p>

        {/* Links */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {links.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors ${
                  index !== links.length - 1 ? 'border-b border-[var(--border)]' : ''
                }`}
              >
                <span className="flex-1 text-sm text-[var(--text-main)]">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
              </Link>
            ))}
          </div>
        </section>

        {/* External */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <a
              href="https://tabito.site"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-[var(--border)]"
            >
              <Globe className="w-5 h-5 text-[var(--muted)]" />
              <span className="flex-1 text-sm text-[var(--text-main)]">{t('about.website')}</span>
              <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
            </a>
            <a
              href="mailto:support@tabito.site"
              className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <Github className="w-5 h-5 text-[var(--muted)]" />
              <span className="flex-1 text-sm text-[var(--text-main)]">{t('about.contact')}</span>
              <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
            </a>
          </div>
        </section>

        <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--muted)] pt-2">
          Made with <Heart className="w-3.5 h-3.5 text-[var(--primary)] fill-[var(--primary)]" /> in Japan
        </p>
        <p className="text-center text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} TABITO
        </p>
      </div>
    </div>
  );
}
