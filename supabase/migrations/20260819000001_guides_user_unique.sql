-- ════════════════════════════════════════════════════════════════
-- 1アカウント = 1クリエイター登録 を DB で保証する
--
-- guides.user_id に UNIQUE が無いため、1ユーザーが複数の guides 行を
-- 持ててしまっていた。コードは全体が1対1前提で書かれており、
-- getMyGuideProfile が読めずに「未登録」と誤判定 → 登録フォームが出続ける →
-- 登録するたび行が増える、というループになっていた (#12)。
--
-- コード側の耐性は既に入れてあるので、ここでは前提そのものを DB に持たせる。
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────
-- 1. 重複しているクリエイター登録を最古の1件に寄せる
--    packages.guide_id は ON DELETE CASCADE なので、
--    必ず「先に付け替えてから削除」する。順序を逆にすると商品が消える。
-- ────────────────────────────────────────────────
WITH ranked AS (
  SELECT id, user_id,
         row_number() OVER (PARTITION BY user_id ORDER BY created_at, id) AS rn
  FROM guides
  WHERE user_id IS NOT NULL
),
survivor AS (
  SELECT user_id, id FROM ranked WHERE rn = 1
),
doomed AS (
  SELECT r.id AS old_id, s.id AS keep_id
  FROM ranked r
  JOIN survivor s ON s.user_id = r.user_id
  WHERE r.rn > 1
)
UPDATE packages p
SET guide_id = d.keep_id
FROM doomed d
WHERE p.guide_id = d.old_id;

-- ────────────────────────────────────────────────
-- 2. 空になった重複行を削除（guide_translations は CASCADE で消える）
-- ────────────────────────────────────────────────
WITH ranked AS (
  SELECT id, user_id,
         row_number() OVER (PARTITION BY user_id ORDER BY created_at, id) AS rn
  FROM guides
  WHERE user_id IS NOT NULL
)
DELETE FROM guides
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ────────────────────────────────────────────────
-- 3. 以後は DB が重複を拒否する
--    user_id IS NULL のシードガイドは対象外。
--    Postgres の UNIQUE は NULL 同士を重複と見なさないため、
--    未紐付けのガイドは何行あっても通る。
-- ────────────────────────────────────────────────
ALTER TABLE guides
  ADD CONSTRAINT guides_user_id_key UNIQUE (user_id);

COMMENT ON CONSTRAINT guides_user_id_key ON guides IS
  '1アカウント1クリエイター登録。未紐付け(user_id IS NULL)は複数可';
