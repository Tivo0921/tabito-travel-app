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

- Vercel プロジェクト: `tabito-travel-app` (`prj_53a1hcsYHJydlQtVzXQB0yOWxjLg`)
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

開発段階では `staging` に push して stg でレビューし、本番に出して良いと確認できた分だけ
`main` へ上げる。これを既定の進め方とする。

1. `staging` で開発する
2. `npx tsc --noEmit` を通す（CI と同じ検査。落ちると CI が赤くなる）
3. `staging` に push → 自動で https://stg.tabito.site が更新される
4. **stg で実物をレビューする。** 修正が要れば 1 に戻る（何度 push しても本番には影響しない）
5. 本番に出して良いと判断できたら `staging` → `main` の PR を作る
6. **マージ＝即本番公開。** ここだけが不可逆なので、必ずユーザーの明示的な判断を仰ぐ

## 作業時のルール

- **通常の作業ブランチは `staging`。** ここへの push は stg にしか出ないので安全
- `main` への直接 push は禁止。必ず `staging` → `main` の PR 経由にする
- コミット・push はユーザーから明示的に依頼された時だけ行う
- 本番向けの操作（main へのマージ、本番デプロイ）は勝手に実行せず必ず確認を取る
- 未完成の機能を staging に置くのは問題ないが、**main へ上げる時は
  「中途半端な状態で本番公開されないか」を必ず点検する**
  （例: UI多言語化が一部画面のみの状態で本番へ出た前例がある）

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
