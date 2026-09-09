<div align="center">

<img src="public/brand/logo-red.png" alt="TABITO" width="180" />

**訪日旅行者と、日本のローカルガイドをつなぐ旅行ガイドアプリ**

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2F%20RLS-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Stripe](https://img.shields.io/badge/Stripe-Checkout-635BFF?logo=stripe&logoColor=white)](https://stripe.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel&logoColor=white)](https://vercel.com)

[**tabito.site**](https://tabito.site) — 本番稼働中

</div>

---

## これは何か

日本を訪れる旅行者は、ガイドブックに載っていない「その土地の人が本当に行く場所」に
たどり着けない。一方で、案内できる知識を持つ現地の人には、それを届ける手段がない。

**TABITO** はその両側をつなぐ。ローカルガイドが自分の視点で旅程（パッケージ）を作って
公開し、旅行者はそれを購入して、そのガイド本人とアプリ内でチャットしながら旅を組み立てる。
マナー・日本語フレーズ・特集記事といった、旅の前に知っておきたい情報も同じ場所にまとめている。

UI は **日本語・英語・韓国語**の3言語に対応している。

## 主な機能

| | |
|---|---|
| 🗺 **パッケージ探索** | エリア・カテゴリで旅程を検索。スポット単位で内容を確認できる |
| 💳 **購入** | Stripe Checkout による決済。Webhook で購入を確定する |
| 💬 **ガイドとのチャット** | 購入後に解錠されるリアルタイムチャット。Supabase Realtime で即時反映 |
| 🧳 **旅行計画** | 購入したパッケージをブロックとして日程表に配置し、自分の旅程を組む |
| ✍️ **クリエイター機能** | ガイド登録・パッケージの作成/編集・購入者とのやりとり |
| 🙇 **マナー / フレーズ集** | 訪日前に知りたい文化的な作法と、現地で使う日本語表現 |
| 📖 **マガジン** | 特集記事とコミュニティ投稿ルート |
| 🌐 **3言語 UI** | 日本語・英語・韓国語。Cookie に保存しサーバー側で初期描画 |

## 技術スタック

| レイヤ | 採用技術 |
|---|---|
| フレームワーク | Next.js 16（App Router / Server Components）, React 19 |
| 言語 | TypeScript 5.7（`strict`） |
| UI | Tailwind CSS v4, Radix UI (shadcn/ui), lucide-react |
| バックエンド | Supabase — PostgreSQL / Auth (Google OAuth) / Realtime / Row Level Security |
| 決済 | Stripe Checkout + Webhook |
| インフラ | Vercel（staging / production の2環境）, GitHub Actions |

## 設計上の判断

コードを読むときに見てほしい部分をまとめる。

### 認可はアプリ層ではなく DB に置く

「購入していないユーザーがチャットを開けない」といった制約を、
アプリのコード側の `if` ではなく **PostgreSQL の Row Level Security** で表現している。
全 27 テーブルで RLS を有効化し、**81 本のポリシー**を定義した。

チャットスレッドの作成ポリシーが典型で、「購入者本人であること」「その購入が完了して
いること」「相手が本当にそのパッケージのクリエイターであること」を、すべて DB 側の
`WITH CHECK` で検証している。

```sql
CREATE POLICY "chat_threads_insert_buyer"
  ON chat_threads FOR INSERT TO authenticated
  WITH CHECK (
    buyer_id = (SELECT auth.uid())
    AND EXISTS ( SELECT 1 FROM purchases p
                 WHERE p.id = purchase_id
                   AND p.user_id = (SELECT auth.uid())
                   AND p.package_id = chat_threads.package_id
                   AND p.status = 'completed' )
    AND EXISTS ( SELECT 1 FROM packages pk
                 JOIN guides g ON g.id = pk.guide_id
                 WHERE pk.id = chat_threads.package_id
                   AND g.user_id = chat_threads.creator_id )
  );
```

こうしておくと、API を1本足したときにうっかり認可を書き忘れても穴にならない。
再帰参照が必要な箇所（スレッド参加者の判定など）は `private` スキーマの
`SECURITY DEFINER` 関数に切り出して、ポリシー同士の無限再帰を避けている。

`auth.uid()` を `(SELECT auth.uid())` で包んでいるのは、行ごとの再評価を防いで
プランナに初期化式として扱わせるため。

### 翻訳は「UI」と「コンテンツ」を分けて考える

UI 文言とユーザー投稿コンテンツを同じ仕組みで訳すと破綻する、という判断で二つに分けた。

- **UI 文言** — `lib/i18n/dictionaries/ja.ts` を全キーの正とし、`en.ts` / `ko.ts` は
  `Record<TranslationKey, string>` 型にした。**キーの追加漏れは `tsc` が落として教えてくれる**（各言語 493 キー）
- **DB 由来のコンテンツ** — ガイドや記事は投稿された言語のまま出す。
  機械翻訳で語り口を壊さないため。訳が必要なものだけ `*_translations` テーブルを別に持つ

選択言語は `localStorage` ではなく **Cookie** に保存している。サーバーコンポーネントで
初期描画する際に読めないと、ハイドレーション不一致を起こすため。Cookie が無い初回訪問
（SNS の OGP 取得やクローラーを含む）は `Accept-Language` から推定する。

### 決済 Webhook は二重着火を前提に書く

Stripe の Webhook は同じイベントを複数回送ってくる。購入レコードは
`stripe_session_id` を競合キーにした upsert で書き込み、何度受けても結果が変わらない
ようにしている。

```ts
await supabase.from('purchases').upsert(
  { user_id, package_id, /* … */ stripe_session_id: session.id },
  { onConflict: 'stripe_session_id', ignoreDuplicates: true }
);
```

### モバイルが基準

訪日旅行者は歩きながらスマホで開く。そこを基準に組み、`lg`(1024px) 以上で
PC 向けに切り替える。`lg` 未満は下部の `BottomNav`、`lg` 以上は左固定の `SideNav`。

### 壊さずに出すための4段構え

機能ブランチ → PR → `staging` → 実機でのユーザーテスト → `main`（本番）。
`staging` はブランチドメインに紐づけてあり、push するたび同じ URL が差し替わるので、
テストしてもらう相手に毎回別の URL を渡さずに済む。

CI（GitHub Actions）は `npx tsc --noEmit` のみを実行する。ESLint は未整備の状態で
握り潰して「通過」に見せたくないので、意図的に走らせていない。

## 構成

```
app/
  (main)/          # BottomNav / SideNav を持つ主要画面
    explore/       #   パッケージ探索
    package/[id]/  #   パッケージ詳細・購入
    chat/[id]/     #   ガイドとのリアルタイムチャット
    plan/          #   旅行計画ボード
    creator/       #   クリエイター（ガイド）向け画面
    manner/ magazine/ route/ settings/
  api/
    checkout/      # Stripe Checkout セッション作成・検証
    webhook/       # Stripe Webhook（購入の確定）
    account/delete # アカウント削除
  auth/callback/   # Supabase OAuth コールバック
lib/
  i18n/            # 3言語辞書・サーバー側ロケール解決
  supabase/        # client / server / service の3クライアント + 型生成物
components/        # 自作コンポーネント（components/ui は shadcn/ui 由来）
supabase/
  migrations/      # 13 マイグレーション・約 2,700 行の SQL
proxy.ts           # セッション更新とメンテナンスモード
```

Supabase クライアントは用途別に3つに分けている。ブラウザ用（anon）、
サーバーコンポーネント用（Cookie 連携）、そして service role 用。
service role は Webhook などサーバー内部からしか呼ばず、クライアントには絶対に渡さない。

## ローカルで動かす

Node.js 20.9 以上（CI は 24）と [Supabase CLI](https://supabase.com/docs/guides/cli) が必要。

```bash
npm ci

# ローカル Supabase を起動し、マイグレーションとシードを適用する
supabase start
supabase db reset

# .env.local を用意する（値は supabase start の出力と Stripe ダッシュボードから）
cp .env.local.example .env.local

npm run dev       # http://localhost:3000
```

```bash
npx tsc --noEmit  # CI と同じ型チェック
```

## ライセンス

**All Rights Reserved.** © 2026 Shun Ikeda and Jeongwon Yun

本アプリは 池田駿 と ユンジョンウォン の2名による共同開発で、
著作権は両名が共同で保有しています。

ポートフォリオとして公開しているもので、閲覧・評価のためのリポジトリです。
コードおよびブランド素材の複製・再配布・派生物の作成・使用は許諾していません。
詳細は [LICENSE](LICENSE) を参照してください。
