# パッケージ購入者 ↔ クリエイター チャット機能 要件定義

作成: 2026-08-07 / ステータス: **ドラフト（未着手・未実装）**

## 1. 目的

パッケージを購入した旅行者が、そのパッケージを作ったクリエイター（ガイド）に
直接質問・相談できるようにする。集合場所の確認、現地での疑問、旅行後のお礼など。

## 2. 決定事項

| 論点 | 決定 |
|---|---|
| スレッド単位 | **購入（パッケージ）ごと**。同じクリエイターから2つ買えばスレッドも2つ |
| 開始条件 | `purchases.status = 'completed'` になった時点 |
| 利用期間 | **無期限**（期間制限を設けない）。2026-08-07 決定 |
| 未紐付けガイド | シードガイド3件に**実アカウントを作成**して対応（§6） |
| 通知の宛先メール | **Google アカウントのメールを利用**。ただし `profiles` には持たせず、サーバ側（サービスロール）で `auth.users` を読む（§5-5） |
| v1 スコープ | 未読バッジ・既読 / 画像送信 / 通報・ブロック / メール・プッシュ通知 をすべて含む |

## 3. 既存実装の前提（調査済み）

- 購入完了は `app/api/webhook/route.ts`（Stripe webhook）と `app/api/checkout/verify/route.ts`
  が `purchases.status = 'completed'` を書き込んで確定する。チャット解禁はこれに乗せる
- `hasPurchased()` (`lib/supabase/queries.ts:896`) が購入判定を持っている。**ただし現在
  `user_id` で絞っていない**ため、チャット権限判定に流用する前に要確認（§7-4）
- クリエイター側の管理画面は `app/(main)/creator/` に既存。チャット一覧はここに置く
- `SUPABASE_SERVICE_ROLE_KEY` は設定済み。webhook からの通知送信に使える
- **Realtime は未設定。** マイグレーションに `supabase_realtime` パブリケーション追加が必要
- **メール／プッシュ基盤は一切無い。** `package.json` に該当ライブラリなし（§5-4）
- **Storage は未使用。** バケット作成から必要（§5-2）
- `app/(main)/settings/notifications/page.tsx` は **UIのみで永続化されていない**
  （`useState` だけ）。通知設定を機能させるなら保存先の実装が要る

## 4. データモデル（案）

```
chat_threads
  id              uuid PK
  purchase_id     uuid UNIQUE NOT NULL → purchases(id)   -- 1購入1スレッド
  package_id      uuid NOT NULL → packages(id)           -- 表示用（非正規化）
  buyer_id        uuid NOT NULL → profiles(id)
  creator_id      uuid NOT NULL → profiles(id)           -- guides.user_id の実体
  status          text  'open' | 'read_only' | 'closed'
  last_message_at timestamptz                            -- 一覧の並び替え用
  created_at      timestamptz

chat_messages
  id           uuid PK
  thread_id    uuid NOT NULL → chat_threads(id) ON DELETE CASCADE
  sender_id    uuid NOT NULL → profiles(id)
  body         text                                       -- 画像のみの場合は空
  image_path   text                                       -- Storage のパス
  created_at   timestamptz
  -- CHECK (body <> '' OR image_path IS NOT NULL)

chat_reads
  thread_id    uuid → chat_threads(id) ON DELETE CASCADE
  user_id      uuid → profiles(id)
  last_read_at timestamptz
  PRIMARY KEY (thread_id, user_id)

chat_reports                                              -- 通報
  id, thread_id, message_id, reporter_id, reason, created_at, handled_at

chat_blocks                                               -- ブロック
  blocker_id, blocked_id, created_at
  PRIMARY KEY (blocker_id, blocked_id)
```

**設計意図**

- `purchase_id` を UNIQUE にすることで「1購入1スレッド」をDB制約で保証する
- 未読数は `chat_reads.last_read_at` より新しい `chat_messages` を数える方式。
  メッセージ側に既読フラグを持たせるより行更新が発生せず、スケールしやすい
- `last_message_at` は一覧のソート用に非正規化。トリガーで更新する

## 5. 機能要件

### 5-1. 基本のチャット（必須）

- 購入完了後、パッケージ詳細と購入完了画面に「クリエイターに質問する」導線を出す
- 購入者側のチャット一覧をどこに置くか要決定（§7-2）
- クリエイター側は `app/(main)/creator/` 配下に受信箱を新設
- メッセージはテキスト。改行可。文字数上限を設ける（案: 2000字）
- Realtime で相手の新着を即時反映（`supabase_realtime` への追加が前提）

### 5-2. 画像の送信

- Supabase Storage に **private バケット** `chat-images` を新設
- パスは `{thread_id}/{message_id}.{ext}` とし、スレッド参加者のみ読み取り可のRLSを張る
- クライアント側で長辺 1600px 程度にリサイズしてからアップロード
  （`next.config.mjs` が `images.unoptimized: true` のため、原寸を配信すると重い）
- 上限案: 1枚 5MB / 1メッセージ1枚

### 5-3. 未読バッジ・既読

- チャット一覧に未読件数バッジ
- ボトムナビ／サイドナビの該当項目にも合計未読数を出す（要デザイン）
- スレッドを開いた時点で `chat_reads.last_read_at` を更新
- 相手が読んだかどうかを自分の送信メッセージに表示（既読表示）

### 5-4. 通報・ブロック

- メッセージ単位で通報。理由を選択式＋自由記述
- ユーザー単位でブロック。ブロック中は双方向で新規送信不可
- **通報の受け皿となる運用フロー・管理画面が別途必要**（§7-3）

### 5-5. 通知

新着メッセージを相手に通知する。**基盤が無いため新規導入が必要。**

- メール: Resend 等の導入が必要（Vercel Marketplace 経由で入れるのが素直）
- **宛先の取得はサーバ側に閉じる。** `profiles` はチャット相手に行ごと開放される
  RLSポリシーがあるため、メールアドレスを置くと相手に読まれる。
  サービスロールで `auth.users.email` を読むこと
- プッシュ: PWA の Web Push か、ネイティブ化するかで実装が大きく変わる（§7-5）
- 送信トリガーは「相手が一定時間オンラインでない場合のみ」等の抑制が要る。
  1通ごとに即メールすると通知過多になる
- `settings/notifications` の画面を実際に機能させる（現在は永続化されていない）

## 6. 未紐付けガイドへの対応

`guides.user_id` が null のシードガイド3件（東京・大阪・京都）に実アカウントを作成する。

- Supabase Auth にクリエイター用アカウントを作り、`profiles` と `guides.user_id` を紐付ける
- 本番に実体のないアカウントが残るため、**本番投入前に実際のクリエイターへ
  差し替えるか削除する**方針を決めておくこと
- `guides.user_id` は現在 nullable。将来的に NOT NULL にするかは別途検討

## 7. 未決定事項（実装前に要決定）

1. ~~送信可能期間の日数~~ → **無期限に決定**（2026-08-07）。
   スキーマに旅行日と購入を結びつける項目が無いため、そもそも
   「旅行終了後◯日」の判定は不可能だった。無期限なら制約を受けない。
   `chat_threads.status` は将来の返金対応等に備えて残す
2. **購入者側のチャット一覧の置き場所。** プロフィール配下 / ボトムナビに新タブ追加 /
   購入済みパッケージ詳細からのみ、のいずれか。ナビ項目を増やすかの判断を含む
3. **通報の運用。** 誰がどこで確認して対応するか。管理画面を作るのか、
   まずは通知メールだけで運用するのか
4. ~~`hasPurchased()` の user_id 絞り込み~~ → **調査完了・対応済み**（2026-08-07）。
   RLS (`purchases_select_own`) が効いており **セキュリティ上の問題は無し**。
   ただし別バグを発見: `purchases` に `(user_id, package_id)` の UNIQUE 制約が無く
   再購入で複数行になると `.maybeSingle()` が PGRST116 を返し、
   **購入済みでも false になる**（ローカルDBで再現確認済み）。`limit(1)` を追加して修正した
5. **プッシュ通知の方式。** PWA(Web Push) かネイティブアプリか

## 8. 段階的リリースの提案

v1 に4機能すべてを含める決定だが、通知（§5-5）は**外部サービス導入・
配信基盤・通知設定の永続化**まで必要で、他の3つと比べて工数が突出する。
チャット本体より大きくなる可能性がある。

以下の順で出すことを推奨する（最終判断はユーザー）。

| 段階 | 内容 | 備考 |
|---|---|---|
| 1 | スレッド・送受信・Realtime・未読既読 | チャットとして成立する最小構成 |
| 2 | 画像送信・通報・ブロック | Storage と運用フローが要る |
| 3 | メール・プッシュ通知 | 外部サービス導入。単独で大きい |

段階1だけでも「購入者がクリエイターに質問できる」という目的は達成できる。

## 9. スコープ外（今回やらない）

- 購入前の問い合わせ（購入者のみが対象）
- グループチャット・複数人スレッド
- 音声・動画通話、ファイル添付（画像以外）
- 自動翻訳（UI言語は i18n で切替可能だが、**メッセージ本文は翻訳しない**。
  投稿コンテンツを翻訳しない既存方針に合わせる）
- チャット内での決済・追加課金
