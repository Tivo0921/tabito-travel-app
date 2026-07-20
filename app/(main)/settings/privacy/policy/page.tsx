'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

const LAST_UPDATED = '2026年7月20日';

const sections: { title: string; body: string[] }[] = [
  {
    title: '1. 取得する情報',
    body: [
      'アカウント情報（Googleアカウントの氏名・メールアドレス・プロフィール画像）',
      '利用情報（閲覧・保存したガイド、旅行計画、購入履歴）',
      'アクセス解析のための匿名の利用統計（Vercel Analytics）',
    ],
  },
  {
    title: '2. 利用目的',
    body: [
      '本サービスの提供・維持・改善のため',
      'コンテンツのおすすめや購入手続きのため',
      'お問い合わせ対応および重要なお知らせの送付のため',
    ],
  },
  {
    title: '3. 第三者提供',
    body: [
      '当社は、法令に基づく場合を除き、利用者の同意なく個人情報を第三者に提供しません。',
      '決済処理のためにStripe、認証・データ保管のためにSupabaseを利用しており、これらの提供先で情報が処理されます。',
    ],
  },
  {
    title: '4. データの保管と削除',
    body: [
      '利用者は、アプリ内の「データをダウンロード」から自身のデータを取得できます。',
      '「アカウント削除」から、アカウントおよび関連データの削除を申請できます。',
    ],
  },
  {
    title: '5. お問い合わせ',
    body: [
      '本ポリシーに関するお問い合わせは support@tabito.site までご連絡ください。',
    ],
  },
];

export default function PrivacyPolicyPage() {
  const router = useRouter();

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
        <h1 className="text-2xl font-bold text-[var(--text-main)]">プライバシーポリシー</h1>
        <p className="text-sm text-[var(--text-sub)] mt-1">最終更新日：{LAST_UPDATED}</p>
      </header>

      <div className="px-5 pb-10">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-6">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-sm font-bold text-[var(--text-main)] mb-2">{s.title}</h2>
              <div className="space-y-2">
                {s.body.map((p, i) => (
                  <p key={i} className="text-sm text-[var(--text-sub)] leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-xs text-[var(--muted)] leading-relaxed mt-4 px-1">
          ※ 本文は暫定版です。正式公開前に法務レビューを受けてください。
        </p>
      </div>
    </div>
  );
}
