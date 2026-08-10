'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Shield, Lock, Eye, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useT } from '@/lib/i18n/provider';

interface ToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
        enabled ? 'bg-[var(--primary)]' : 'bg-gray-200'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
          enabled ? 'translate-x-6' : 'translate-x-0'
        )}
      />
    </button>
  );
}

export default function PrivacySettingsPage() {
  const t = useT();
  const router = useRouter();
  const [analytics, setAnalytics] = useState(true);
  const [personalized, setPersonalized] = useState(true);

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
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{t('privacy.title')}</h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">{t('privacy.desc')}</p>
      </header>

      <div className="px-5 space-y-6 pb-8">
        {/* Data usage */}
        <section>
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 px-1">
            {t('privacy.group.usage')}
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-4 border-b border-[var(--border)]">
              <Eye className="w-5 h-5 text-[var(--muted)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)]">{t('privacy.analytics')}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {t('privacy.analyticsDesc')}
                </p>
              </div>
              <Toggle enabled={analytics} onChange={setAnalytics} />
            </div>
            <div className="flex items-center gap-4 px-4 py-4">
              <Shield className="w-5 h-5 text-[var(--muted)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)]">{t('privacy.personalize')}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {t('privacy.personalizeDesc')}
                </p>
              </div>
              <Toggle enabled={personalized} onChange={setPersonalized} />
            </div>
          </div>
        </section>

        {/* Data management */}
        <section>
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 px-1">
            {t('privacy.group.manage')}
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <Link
              href="/settings/privacy/download"
              className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-[var(--border)]"
            >
              <Download className="w-5 h-5 text-[var(--muted)]" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-main)]">{t('privacy.download')}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{t('privacy.downloadDesc')}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
            </Link>
            <Link
              href="/settings/privacy/policy"
              className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <Lock className="w-5 h-5 text-[var(--muted)]" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-main)]">{t('privacy.policy')}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
            </Link>
          </div>
        </section>

        <div className="p-4 bg-[var(--primary-soft)] rounded-2xl">
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            {t('privacy.note')}
          </p>
        </div>
      </div>
    </div>
  );
}
