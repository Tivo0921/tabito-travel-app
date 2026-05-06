'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  BookOpen,
  Mail,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    id: '1',
    category: 'ガイド・パッケージ',
    q: 'ガイドパッケージとは何ですか？',
    a: 'ガイドパッケージは、現地在住の日本通クリエイターが作成した旅行ガイドです。観光スポット、グルメ、移動手段など、テーマ別にまとめたコースを購入・利用できます。',
  },
  {
    id: '2',
    category: 'ガイド・パッケージ',
    q: '購入したガイドはどこで確認できますか？',
    a: 'プロフィール画面の「保存済み」タブから購入済みのガイドを確認できます。また、各ガイド詳細ページからも直接アクセスできます。',
  },
  {
    id: '3',
    category: '支払い',
    q: '支払い方法は何が使えますか？',
    a: 'クレジットカード（Visa、Mastercard、American Express）およびApple Pay・Google Payに対応しています。支払いはStripeによる安全な決済で処理されます。',
  },
  {
    id: '4',
    category: '支払い',
    q: '返金はできますか？',
    a: 'デジタルコンテンツの性質上、原則として購入後の返金はお受けできません。ただし、コンテンツに重大な問題がある場合はサポートまでご連絡ください。',
  },
  {
    id: '5',
    category: 'アカウント',
    q: 'ログインできません',
    a: 'メールアドレスとパスワードをご確認ください。Googleアカウントでのログインも可能です。「パスワードを忘れた」からリセットもできます。それでも解決しない場合はサポートへお問い合わせください。',
  },
  {
    id: '6',
    category: 'アカウント',
    q: 'アカウントを削除したい',
    a: 'プロフィール → 設定 → アカウント削除から手続きできます。削除後、データの復元はできませんのでご注意ください。',
  },
  {
    id: '7',
    category: 'クリエイター',
    q: 'クリエイターになるには？',
    a: 'プロフィール画面から「ガイド・クリエイター管理」に進み、クリエイター登録を申請できます。審査後、ガイドパッケージの作成・販売が可能になります。',
  },
  {
    id: '8',
    category: 'マナーガイド',
    q: 'マナーガイドは無料ですか？',
    a: 'はい、マナーガイドはすべて無料でご利用いただけます。日本旅行に役立つエチケット情報をシーン別に提供しています。',
  },
];

const categories = ['すべて', 'ガイド・パッケージ', '支払い', 'アカウント', 'クリエイター', 'マナーガイド'];

export default function HelpPage() {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('すべて');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = faqs.filter((faq) => {
    const matchCat = activeCategory === 'すべて' || faq.category === activeCategory;
    const matchSearch =
      searchQuery === '' ||
      faq.q.includes(searchQuery) ||
      faq.a.includes(searchQuery);
    return matchCat && matchSearch;
  });

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      <header className="px-5 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[var(--primary)] mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">戻る</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">ヘルプ</h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">よくある質問とサポート情報</p>
      </header>

      {/* Search */}
      <div className="px-5 mb-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="質問を検索..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--border)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="px-5 mb-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all',
                activeCategory === cat
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-white text-[var(--text-sub)] border border-[var(--border)]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="px-5 mb-8">
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
              <p className="text-[var(--text-main)] font-medium">該当する質問がありません</p>
              <p className="text-sm text-[var(--text-sub)] mt-1">別のキーワードで検索してみてください</p>
            </div>
          ) : (
            filtered.map((faq) => (
              <div key={faq.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                  className="w-full flex items-start gap-3 px-4 py-4 text-left"
                >
                  <div className="flex-1">
                    <span className="inline-block text-xs font-medium text-[var(--primary)] bg-[var(--primary-soft)] px-2 py-0.5 rounded-full mb-1.5">
                      {faq.category}
                    </span>
                    <p className="text-sm font-medium text-[var(--text-main)]">{faq.q}</p>
                  </div>
                  {openId === faq.id ? (
                    <ChevronUp className="w-5 h-5 text-[var(--muted)] flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[var(--muted)] flex-shrink-0 mt-0.5" />
                  )}
                </button>
                {openId === faq.id && (
                  <div className="px-4 pb-4 border-t border-[var(--border)]">
                    <p className="text-sm text-[var(--text-sub)] mt-3 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Contact support */}
      <div className="px-5 pb-8">
        <div className="p-5 bg-gradient-to-r from-[var(--primary-soft)] to-[var(--accent)]/30 rounded-3xl">
          <h3 className="font-bold text-[var(--text-main)] mb-1">解決しない場合は</h3>
          <p className="text-sm text-[var(--text-sub)] mb-4">サポートチームに直接お問い合わせください</p>
          <div className="flex gap-3">
            <a
              href="mailto:support@tabito.app"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white rounded-2xl text-sm font-medium text-[var(--text-main)] hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-4 h-4 text-[var(--primary)]" />
              メール
            </a>
            <a
              href="https://tabito.app/chat"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--primary)] rounded-2xl text-sm font-medium text-white hover:bg-[var(--primary)]/90 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              チャット
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
