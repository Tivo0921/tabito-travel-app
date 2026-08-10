# TABITO

日本旅行ガイドアプリ。Next.js 16 (App Router) + Supabase + Vercel。

## デプロイ・ブランチ運用

**push / マージ / デプロイに関わる作業をする前に、必ず [`.claude/deployment.md`](.claude/deployment.md) を読むこと。**

特に重要な点だけ再掲する:

- `staging` に push → stg (https://stg.tabito.site) に自動デプロイ
- **`main` へのマージ＝即本番公開**（https://tabito.site）。承認や手動実行のステップは無い
- GitHub Actions はデプロイしない。`npx tsc --noEmit` のみ実行する

`main` への直接 push は禁止。本番に影響する操作は必ずユーザーの確認を取る。

## 開発

```bash
pnpm dev          # http://localhost:3000
npx tsc --noEmit  # CI と同じ型チェック。push 前に通す
```

- ローカルの Supabase は `http://127.0.0.1:54321`（設定は `.env.local`、コミット厳禁）
- `next.config.mjs` で `images.unoptimized: true`。next/image は原画をそのまま配信するため、
  画像は事前にリサイズして `public/brand/` に置く

## UI 表示言語 (i18n)

- 対応言語は日本語・英語・韓国語の3つ。`lib/i18n/` 配下
- 文言は `lib/i18n/dictionaries/ja.ts` が全キーの正。`en.ts` / `ko.ts` は
  `Record<TranslationKey, string>` 型なので、**キーの追加漏れは `tsc` が検出する**
- コンポーネントからは `useT()` を使う: `t('home.title')` / `t('explore.count.packages', { count: 4 })`
- 選択言語は Cookie に保存し、サーバー側で読んで初期描画する
  （localStorage だとハイドレーション不一致を起こすため、この方式を崩さないこと）
- **ガイド・記事などDB由来のコンテンツは翻訳しない。** 投稿された言語のまま表示する

## レスポンシブ

- モバイルが基準。`lg`(1024px) 以上で PC 向けレイアウトに切り替える
- `lg` 未満は下部の `BottomNav`、`lg` 以上は左固定の `SideNav`
- 追加するスタイルは `lg:` 接頭辞で足す。既存のモバイル表示を壊さないこと
