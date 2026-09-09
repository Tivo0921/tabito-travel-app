# デプロイ / ブランチ運用ルール

このファイルは 2026-08-06 時点の**実設定を調査して**書いたもの（推測ではない）。
プッシュ・デプロイに関する判断は必ずこれを読んでから行うこと。

## 結論（3行）

- `staging` に push → **stg 環境 (https://stg.tabito.site) に自動デプロイ**
- `main` に push / PR マージ → **本番 (https://tabito.site) に自動デプロイ。手動操作は一切不要**
- GitHub Actions はデプロイしない。型チェックだけ

## よくある誤解

**「main にマージしたあと Actions を手動実行すると本番へ出る」は誤り。**
`.github/workflows/ci.yml` には `workflow_dispatch`（手動実行トリガー）も
デプロイ用ステップも存在しない。main にマージした瞬間、Vercel の Git 連携が
本番デプロイを開始して自動的に本番ドメインへ反映される。**承認ステップは無い。**

→ したがって **main へのマージ＝即本番公開**。マージ前に本番へ出して良い状態か必ず確認する。

## 構成

| ブランチ | Vercel target | 公開URL | トリガー |
|---|---|---|---|
| `staging` | preview | https://stg.tabito.site | push で自動 |
| `main` | **production** | https://tabito.site / www.tabito.site | push・マージで自動 |
| その他 | preview | ランダムURL | push で自動 |

- Vercel プロジェクト: `tabito-travel-app`（プロジェクトIDは `vercel project inspect` で確認）
- Production Branch 設定 = `main`
- `stg.tabito.site` は `staging` ブランチに紐づけた**ブランチドメイン**なので、
  staging に push するたび同じURLが最新に差し替わる
- GitHub リポジトリ: `Tivo0921/tabito-travel-app`（プライベート）

## GitHub Actions (`.github/workflows/ci.yml`)

- 発火条件: `staging` / `main` への push、および両ブランチ宛の PR
- 実行内容: `npm ci` → `npx tsc --noEmit` のみ
- **lint は意図的に未実行**（ESLint 未セットアップ。握り潰して「通過」に見せないための措置）
- デプロイ処理は含まない。手動実行トリガーも無い

## 標準の開発フロー

**機能ブランチ → PR → `staging` → stgでユーザーテスト → `main`（本番）** の4段構え。
`staging` は「テストユーザーに触ってもらう場」であり、直接コミットする場所ではない。

```
feat/xxx ──PR──> staging ──(ユーザーテスト)──> PR ──> main
                    │                                  │
              stg.tabito.site                    tabito.site
```

### 1. 機能ブランチを切る

```bash
git fetch origin
git checkout -b feat/xxx origin/staging   # 必ず origin/staging から切る
```

**`origin/` を付けること。** ローカルの `main` / `staging` は放置すると古くなる。
過去に `git push origin main:staging` としてローカルの古い `main`（数ヶ月前）を
push してしまい、staging を巻き戻した事故がある。

### 2. 実装して push

```bash
npx tsc --noEmit          # CIと同じ検査。落ちるとCIが赤くなる
git push -u origin feat/xxx
```

### 3. PR を作る（宛先は必ず `staging`）

```bash
gh pr create --base staging --head feat/xxx
```

**`--base main` にしない。** 付け忘れるとデフォルトが `main` になり、
マージした瞬間に本番公開される。作成後に `gh pr view <n> --json baseRefName` で確認する。

**機能ごとに分ける。** 多言語化・チャット・アカウント まわりは別PRにする。
依存がある場合はスタックする（例: チャットPRの base を i18n PR のブランチにする）。
先行PRがマージされたら、後続PRの base を `staging` に付け替える。

### 4. レビュー → `staging` にマージ → stg で確認

マージすると https://stg.tabito.site に自動デプロイされる。ここでテストユーザーに触ってもらう。
**本番には影響しないので、何度でもやり直せる。**

### 5. 本番へ（`staging` → `main`）

```bash
gh pr create --base main --head staging
```

**マージ＝即本番公開。承認ステップは無い。** 必ずユーザーの明示的な判断を仰ぐ。

## DBマイグレーションを含む場合（重要）

**CI もVercel もマイグレーションを適用しない。** コードだけが先に出ると、
テーブルが無い状態で参照して 500 になる。

**PRをマージする前に**、対象環境の Supabase へ手で適用する:

| マージ先 | 対象のSupabase |
|---|---|
| `staging` | stg (`TABITO-stg`) |
| `main` | **本番** (`TABITO`) |

**project-ref はこのリポジトリに書かない**（公開リポジトリのため）。
`supabase projects list` で名前と ref の対応を引いてから link する:

```bash
supabase projects list                  # TABITO-stg / TABITO の ref を確認
supabase link --project-ref <上で確認したref>
supabase db push
```

**link 先を必ず確認してから push する。** 取り違えると本番DBにスキーマ変更が入る。
`supabase projects list` で現在のリンク先を確かめられる。

`supabase/seed.sql` は `supabase db reset`（ローカル）専用で、本番には流れない。

## 作業時のルール

- `main` への直接 push は禁止。`staging` への直接 push も避け、PR を経由する
- コミット・push はユーザーから明示的に依頼された時だけ行う
- 本番向けの操作（main へのマージ、本番デプロイ）は勝手に実行せず必ず確認を取る
- `main` へ上げる時は **「中途半端な状態で本番公開されないか」を必ず点検する**
  （例: UI多言語化が一部画面のみの状態で本番へ出た前例がある）
- 作業前に `git fetch origin` してブランチの位置を確認する。
  ローカルの `main` / `staging` は明示的に追従させないとずれる:
  ```bash
  git branch -f main origin/main
  git branch -f staging origin/staging
  ```

## つまずいた時

| 症状 | 原因と対処 |
|---|---|
| PRの差分が異常に大きい | base がずれている。`gh pr edit <n> --base staging` で付け替え、数分待つと再計算される |
| PRの宛先が `main` になっている | `gh pr create` で `--base` を付け忘れた。`gh pr edit` で修正 |
| 先行PRをマージしたら後続PRが宙に浮いた | 後続の base を `staging` に付け替え、`git merge origin/staging` で最新を取り込む |
| stg でチャット等が500 | マイグレーション未適用。`supabase db push` |
| ローカルブランチが古い | `git fetch origin` → `git branch -f <name> origin/<name>` |

## 環境変数

- ローカルは `.env.local`（`.gitignore` 済み。Supabase の鍵が入るのでコミット厳禁）
- Vercel 側の環境変数は環境ごとに別管理。`vercel env ls` で確認できる
- stg の `NEXT_PUBLIC_SUPABASE_URL` が壊れていた履歴があるので、
  stg で認証系が動かない時はまずこの値を疑う

## 調べ直したい時のコマンド

```bash
# 本番ブランチ設定
vercel project inspect tabito-travel-app

# 直近デプロイのブランチと環境
vercel ls tabito-travel-app

# ローカルとリモートの差分
git log origin/staging..HEAD --oneline
```
