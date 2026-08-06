'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

const LAST_UPDATED = '2026年7月20日';

const sections: { title: string; body: string[] }[] = [
  {
    title: '第1条（適用）',
    body: [
      '本規約は、TABITO（以下「本サービス」）の提供条件および本サービスの利用に関する当社と利用者との間の権利義務関係を定めるものです。',
      '利用者は、本サービスを利用することにより本規約に同意したものとみなされます。',
    ],
  },
  {
    title: '第2条（アカウント）',
    body: [
      '利用者は、Googleアカウント等を通じて本サービスにログインできます。',
      'アカウントの管理責任は利用者に帰属し、第三者による不正利用について当社は責任を負いません。',
    ],
  },
  {
    title: '第3条（コンテンツと購入）',
    body: [
      '本サービスで提供されるガイド・コンテンツの著作権は、当社または各クリエイターに帰属します。',
      '有料コンテンツの購入は、決済完了時点で成立します。デジタルコンテンツの性質上、原則として購入後の返金はできません。',
    ],
  },
  {
    title: '第4条（禁止事項）',
    body: [
      '法令または公序良俗に違反する行為、当社もしくは第三者の権利を侵害する行為、本サービスの運営を妨害する行為を禁止します。',
    ],
  },
  {
    title: '第5条（免責）',
    body: [
      '当社は、本サービスに掲載された情報の正確性・完全性を保証するものではありません。',
      '本サービスの利用により生じた損害について、当社の故意または重過失による場合を除き、責任を負いません。',
    ],
  },
  {
    title: '第6条（規約の変更）',
    body: [
      '当社は、必要と判断した場合には、利用者に通知することなく本規約を変更できるものとします。',
    ],
  },
];

export default function TermsPage() {
  const router = useRouter();

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
        <h1 className="text-2xl font-bold text-[var(--text-main)]">利用規約</h1>
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
