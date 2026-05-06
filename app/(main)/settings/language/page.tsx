'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check } from 'lucide-react';

const languages = [
  { code: 'ja', label: '日本語', native: '日本語' },
  { code: 'en', label: '英語', native: 'English' },
  { code: 'zh-TW', label: '繁體中文', native: '繁體中文' },
  { code: 'zh-CN', label: '簡体中文', native: '简体中文' },
  { code: 'ko', label: '韓国語', native: '한국어' },
  { code: 'fr', label: 'フランス語', native: 'Français' },
  { code: 'de', label: 'ドイツ語', native: 'Deutsch' },
  { code: 'es', label: 'スペイン語', native: 'Español' },
];

export default function LanguageSettingsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState('ja');

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      <header className="px-5 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[var(--primary)] mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">設定</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">言語設定</h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">アプリの表示言語を選んでください</p>
      </header>

      <div className="px-5 pb-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {languages.map((lang, index) => (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors text-left ${
                index !== languages.length - 1 ? 'border-b border-[var(--border)]' : ''
              }`}
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-main)]">{lang.native}</p>
                <p className="text-xs text-[var(--muted)]">{lang.label}</p>
              </div>
              {selected === lang.code && (
                <Check className="w-5 h-5 text-[var(--primary)]" />
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-[var(--muted)] mt-4 text-center px-4">
          ※ 現在、完全に対応している言語は日本語のみです。他の言語は順次対応予定です。
        </p>
      </div>
    </div>
  );
}
