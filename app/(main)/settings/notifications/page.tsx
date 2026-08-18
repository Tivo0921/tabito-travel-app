'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
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

export default function NotificationsSettingsPage() {
  const t = useT();
  const router = useRouter();
  const [settings, setSettings] = useState({
    newGuide: true,
    planReminder: true,
    promotion: false,
    tips: true,
    review: false,
  });

  const toggle = (key: keyof typeof settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const groups = [
    {
      title: t('notif.group.content'),
      items: [
        { key: 'newGuide' as const, label: t('notif.newGuide'), desc: t('notif.newGuideDesc') },
        { key: 'tips' as const, label: t('notif.tips'), desc: t('notif.tipsDesc') },
      ],
    },
    {
      title: t('notif.group.plan'),
      items: [
        { key: 'planReminder' as const, label: t('notif.planReminder'), desc: t('notif.planReminderDesc') },
      ],
    },
    {
      title: t('notif.group.other'),
      items: [
        { key: 'promotion' as const, label: t('notif.promotion'), desc: t('notif.promotionDesc') },
        { key: 'review' as const, label: t('notif.review'), desc: t('notif.reviewDesc') },
      ],
    },
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
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{t('notif.title')}</h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">{t('notif.desc')}</p>
      </header>

      <div className="px-5 space-y-6 pb-8">
        {groups.map((group) => (
          <section key={group.title}>
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 px-1">
              {group.title}
            </p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {group.items.map((item, index) => (
                <div
                  key={item.key}
                  className={cn(
                    'flex items-center gap-4 px-4 py-4',
                    index !== group.items.length - 1 && 'border-b border-[var(--border)]'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-main)]">{item.label}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle enabled={settings[item.key]} onChange={() => toggle(item.key)} />
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className="text-xs text-[var(--muted)] text-center px-4">
          {t('notif.systemNote')}
        </p>
      </div>
    </div>
  );
}
